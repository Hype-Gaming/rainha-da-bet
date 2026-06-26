<template>
    <div class="chart-card adm-fade-up">
        <div class="chart-head">
            <div class="chart-title">
                <Icon name="ph:chart-line-up-bold" />
                <span>Atividade — últimos 14 dias</span>
            </div>
            <div class="chart-toggle">
                <button
                    :class="{ active: metric === 'users' }"
                    @click="metric = 'users'"
                >
                    Novos usuários
                </button>
                <button
                    :class="{ active: metric === 'deposits' }"
                    @click="metric = 'deposits'"
                >
                    PIX gerados
                </button>
            </div>
        </div>

        <div v-if="loading" class="chart-state adm-skeleton" style="height: 200px"></div>
        <div v-else-if="error" class="chart-state error">{{ error }}</div>
        <div v-else-if="!days.length" class="chart-state">Sem dados no período.</div>

        <svg
            v-else
            class="chart-svg"
            :viewBox="`0 0 ${W} ${H}`"
            preserveAspectRatio="none"
            @mousemove="onMove"
            @mouseleave="hover = null"
        >
            <defs>
                <linearGradient id="adm-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--adm-accent)" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="var(--adm-accent)" stop-opacity="0" />
                </linearGradient>
            </defs>

            <!-- média -->
            <line
                :x1="0" :x2="W" :y1="avgY" :y2="avgY"
                stroke="var(--adm-gold)" stroke-width="1"
                stroke-dasharray="4 4" opacity="0.5"
            />

            <path :d="areaPath" fill="url(#adm-area)" />
            <path :d="linePath" fill="none" stroke="var(--adm-accent)" stroke-width="2" />

            <!-- pontos -->
            <circle
                v-for="(p, i) in points" :key="i"
                :cx="p.x" :cy="p.y" r="2.5"
                fill="var(--adm-accent)"
            />

            <!-- hover -->
            <g v-if="hover">
                <line :x1="hover.x" :x2="hover.x" :y1="0" :y2="H" stroke="var(--adm-border)" stroke-width="1" />
                <circle :cx="hover.x" :cy="hover.y" r="4" fill="#fff" stroke="var(--adm-accent)" stroke-width="2" />
            </g>
        </svg>

        <div v-if="hover && !loading && !error" class="chart-tip" :style="{ left: tipLeft }">
            <strong>{{ hover.label }}</strong>
            <span>{{ hover.value }} {{ metric === 'users' ? 'novos' : 'PIX' }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Day {
    date: string;
    users: number;
    deposits: number;
}

const props = defineProps<{
    days: Day[];
    loading?: boolean;
    error?: string | null;
}>();

const metric = ref<"users" | "deposits">("users");

const W = 600;
const H = 200;
const PAD = 12;

const values = computed(() => props.days.map((d) => d[metric.value]));
const maxVal = computed(() => Math.max(1, ...values.value));
const avg = computed(() =>
    values.value.length
        ? values.value.reduce((a, b) => a + b, 0) / values.value.length
        : 0,
);

const points = computed(() => {
    const n = props.days.length;
    if (!n) return [];
    return props.days.map((d, i) => {
        const x = n === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (n - 1);
        const y = H - PAD - (d[metric.value] / maxVal.value) * (H - PAD * 2);
        return { x, y, value: d[metric.value], date: d.date };
    });
});

const avgY = computed(() => H - PAD - (avg.value / maxVal.value) * (H - PAD * 2));

// linha suave (Catmull-Rom → Bézier)
const linePath = computed(() => {
    const p = points.value;
    if (!p.length) return "";
    if (p.length === 1) return `M ${p[0]!.x} ${p[0]!.y}`;
    let d = `M ${p[0]!.x} ${p[0]!.y}`;
    for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] || p[i]!;
        const p1 = p[i]!;
        const p2 = p[i + 1]!;
        const p3 = p[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
});

const areaPath = computed(() => {
    const p = points.value;
    if (!p.length) return "";
    return `${linePath.value} L ${p[p.length - 1]!.x} ${H} L ${p[0]!.x} ${H} Z`;
});

const hover = ref<{ x: number; y: number; label: string; value: number } | null>(null);
const tipLeft = computed(() => `${((hover.value?.x || 0) / W) * 100}%`);

const fmtLabel = (date: string) => {
    const [, m, d] = date.split("-");
    return `${d}/${m}`;
};

const onMove = (e: MouseEvent) => {
    const p = points.value;
    if (!p.length) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const x = xRatio * W;
    let nearest = p[0]!;
    for (const pt of p) {
        if (Math.abs(pt.x - x) < Math.abs(nearest.x - x)) nearest = pt;
    }
    hover.value = {
        x: nearest.x,
        y: nearest.y,
        label: fmtLabel(nearest.date),
        value: nearest.value,
    };
};
</script>

<style scoped>
.chart-card {
    background: var(--adm-panel);
    border: 1px solid var(--adm-border-soft);
    border-radius: 16px;
    padding: 20px;
    position: relative;
}

.chart-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
}

.chart-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: var(--adm-text);
}

.chart-title :deep(svg) {
    color: var(--adm-accent);
    font-size: 20px;
}

.chart-toggle {
    display: flex;
    gap: 4px;
    background: var(--adm-bg-2);
    border: 1px solid var(--adm-border-soft);
    border-radius: 10px;
    padding: 4px;
}

.chart-toggle button {
    background: transparent;
    border: none;
    color: var(--adm-muted);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.2s var(--adm-ease);
}

.chart-toggle button.active {
    background: var(--adm-accent);
    color: #1a0410;
}

.chart-svg {
    width: 100%;
    height: 200px;
    display: block;
    overflow: visible;
}

.chart-state {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--adm-muted);
    font-size: 14px;
}

.chart-state.error {
    color: var(--adm-red);
}

.chart-tip {
    position: absolute;
    bottom: 20px;
    transform: translateX(-50%);
    background: var(--adm-bg);
    border: 1px solid var(--adm-border);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    color: var(--adm-text);
    display: flex;
    flex-direction: column;
    gap: 2px;
    pointer-events: none;
    white-space: nowrap;
}

.chart-tip span {
    color: var(--adm-muted);
}
</style>
