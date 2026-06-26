<template>
    <div class="gestao-page">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <NuxtLink to="/">
                    <img
                        src="/logo.png"
                        alt="Rainha da Bet"
                        class="header-logo"
                    />
                </NuxtLink>
            </div>
            <div class="header-right">
                <NuxtLink to="/" class="btn-back">
                    <Icon name="ph:arrow-left-bold" />
                    Voltar
                </NuxtLink>
            </div>
        </header>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Animated Background -->
            <div class="animated-bg">
                <div class="gradient-sphere sphere-1"></div>
                <div class="gradient-sphere sphere-2"></div>
                <div class="gradient-sphere sphere-3"></div>
            </div>

            <!-- Content -->
            <div class="content-wrapper">
                <!-- Header Section -->
                <section class="header-section">
                    <div class="header-container">
                        <div class="header-content">
                            <div class="header-text">
                                <h1 class="page-title">
                                    Gestão de
                                    <span class="gradient-text">Banca</span>
                                </h1>
                                <p class="page-subtitle">
                                    Calcule sua estratégia financeira para 30
                                    dias de forma inteligente
                                </p>
                            </div>
                        </div>

                        <!-- Stats Preview -->
                        <div class="stats-preview" v-if="resultados.length > 0">
                            <div class="stat-item">
                                <span class="stat-label">Rentabilidade</span>
                                <span :class="['stat-value', getLucroClass]">
                                    {{
                                        (
                                            ((resultados[resultados.length - 1]
                                                .finalBanca -
                                                bancaInicial) /
                                                bancaInicial) *
                                            100
                                        ).toFixed(2)
                                    }}%
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Calculator Section -->
                <section class="calculator-section">
                    <div class="calculator-container">
                        <div class="calculator-card">
                            <div class="card-header">
                                <div class="card-header-content">
                                    <div>
                                        <h2>Parâmetros de Cálculo</h2>
                                        <span class="card-subtitle"
                                            >Configure sua estratégia de
                                            gestão</span
                                        >
                                    </div>
                                </div>
                            </div>

                            <div class="input-grid">
                                <!-- Banca Inicial -->
                                <div class="input-group">
                                    <div class="input-label">
                                        <div class="label-icon banca-icon">
                                            <Icon name="ph:wallet-bold" />
                                        </div>
                                        <span>BANCA INICIAL</span>
                                    </div>
                                    <div class="input-field-container">
                                        <div class="input-prefix">R$</div>
                                        <input
                                            v-model.number="bancaInicial"
                                            type="number"
                                            placeholder="1000"
                                            step="0.01"
                                            class="custom-input"
                                        />
                                    </div>
                                    <div class="input-hint">
                                        Valor inicial da sua banca
                                    </div>
                                </div>

                                <!-- Meta Diária -->
                                <div class="input-group">
                                    <div class="input-label">
                                        <div class="label-icon meta-icon">
                                            <Icon
                                                name="ph:chart-line-up-bold"
                                            />
                                        </div>
                                        <span>META AO DIA</span>
                                    </div>
                                    <div class="input-field-container">
                                        <input
                                            v-model.number="metaDiaria"
                                            type="number"
                                            placeholder="5"
                                            step="0.1"
                                            class="custom-input"
                                        />
                                        <div class="input-suffix">%</div>
                                    </div>
                                    <div class="input-hint">
                                        Percentual de ganho diário
                                    </div>
                                </div>

                                <!-- Stop Loss -->
                                <div class="input-group">
                                    <div class="input-label">
                                        <div class="label-icon loss-icon">
                                            <Icon name="ph:shield-bold" />
                                        </div>
                                        <span>STOP LOSS</span>
                                    </div>
                                    <div class="input-field-container">
                                        <input
                                            v-model.number="stopLoss"
                                            type="number"
                                            placeholder="10"
                                            step="0.1"
                                            class="custom-input"
                                        />
                                        <div class="input-suffix">%</div>
                                    </div>
                                    <div class="input-hint">
                                        Perda máxima aceitável
                                    </div>
                                </div>
                            </div>

                            <button @click="calcular" class="calculate-button">
                                <Icon name="ph:calculator-bold" />
                                Calcular Gestão
                                <div class="button-glow"></div>
                            </button>
                        </div>

                        <!-- Quick Tips -->
                        <div class="tips-card">
                            <h3>
                                <Icon name="ph:lightbulb-bold" />
                                Dicas Rápidas
                            </h3>
                            <div class="tips-grid">
                                <div class="tip-item">
                                    <div class="tip-icon">
                                        <Icon name="ph:chart-pie-bold" />
                                    </div>
                                    <div class="tip-content">
                                        <h4>Meta Conservadora</h4>
                                        <p>
                                            3-5% ao dia é ideal para iniciantes
                                        </p>
                                    </div>
                                </div>
                                <div class="tip-item">
                                    <div class="tip-icon">
                                        <Icon name="ph:warning-bold" />
                                    </div>
                                    <div class="tip-content">
                                        <h4>Stop Loss Seguro</h4>
                                        <p>
                                            Mantenha entre 5-10% para proteger
                                            seu capital
                                        </p>
                                    </div>
                                </div>
                                <div class="tip-item">
                                    <div class="tip-icon">
                                        <Icon name="ph:brain-bold" />
                                    </div>
                                    <div class="tip-content">
                                        <h4>Disciplina</h4>
                                        <p>
                                            Siga rigorosamente seu plano de
                                            gestão
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Results Section -->
                <section v-if="resultados.length > 0" class="results-section">
                    <div class="results-container">
                        <!-- Data Status -->
                        <div v-if="savedDateInfo" class="data-status">
                            <div class="status-content">
                                <div class="status-info">
                                    <Icon name="ph:floppy-disk-bold" />
                                    <div>
                                        <span class="status-label"
                                            >Dados salvos em</span
                                        >
                                        <span class="status-value">{{
                                            savedDateInfo.date
                                        }}</span>
                                    </div>
                                </div>
                                <div class="status-expiry">
                                    <Icon name="ph:hourglass-bold" />
                                    <span
                                        >Expira em
                                        {{
                                            savedDateInfo.daysRemaining
                                        }}
                                        dias</span
                                    >
                                </div>
                                <button
                                    @click="clearSavedData"
                                    class="clear-data-btn"
                                >
                                    <Icon name="ph:trash-bold" />
                                    Limpar Dados
                                </button>
                            </div>
                        </div>

                        <!-- Summary Cards -->
                        <div class="summary-cards">
                            <div class="summary-card initial">
                                <div class="summary-icon">
                                    <Icon name="ph:play-circle-bold" />
                                </div>
                                <div class="summary-content">
                                    <span class="summary-label"
                                        >Banca Inicial</span
                                    >
                                    <span class="summary-value"
                                        >R$ {{ bancaInicial.toFixed(2) }}</span
                                    >
                                </div>
                            </div>

                            <div class="summary-card final">
                                <div class="summary-icon">
                                    <Icon name="ph:flag-checkered-bold" />
                                </div>
                                <div class="summary-content">
                                    <span class="summary-label"
                                        >Banca Final</span
                                    >
                                    <span class="summary-value"
                                        >R$
                                        {{
                                            resultados[
                                                resultados.length - 1
                                            ].finalBanca.toFixed(2)
                                        }}</span
                                    >
                                </div>
                            </div>

                            <div
                                class="summary-card profit"
                                :class="getLucroClass"
                            >
                                <div class="summary-icon">
                                    <Icon
                                        :name="
                                            resultados[resultados.length - 1]
                                                .finalBanca -
                                                bancaInicial >=
                                            0
                                                ? 'ph:trend-up-bold'
                                                : 'ph:trend-down-bold'
                                        "
                                    />
                                </div>
                                <div class="summary-content">
                                    <span class="summary-label"
                                        >Lucro/Prejuízo</span
                                    >
                                    <span class="summary-value"
                                        >R$
                                        {{
                                            (
                                                resultados[
                                                    resultados.length - 1
                                                ].finalBanca - bancaInicial
                                            ).toFixed(2)
                                        }}</span
                                    >
                                </div>
                            </div>

                            <div
                                class="summary-card roi"
                                :class="getLucroClass"
                            >
                                <div class="summary-icon">
                                    <Icon name="ph:percent-bold" />
                                </div>
                                <div class="summary-content">
                                    <span class="summary-label"
                                        >Rentabilidade</span
                                    >
                                    <span class="summary-value"
                                        >{{
                                            (
                                                ((resultados[
                                                    resultados.length - 1
                                                ].finalBanca -
                                                    bancaInicial) /
                                                    bancaInicial) *
                                                100
                                            ).toFixed(2)
                                        }}%</span
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- Days Grid -->
                        <div class="days-header">
                            <h2>Progressão Diária</h2>
                            <p>
                                Clique nos botões para simular resultados de
                                cada dia
                            </p>
                        </div>

                        <div class="days-grid">
                            <div
                                v-for="(dia, index) in resultados"
                                :key="index"
                                class="day-card"
                                :class="{
                                    green: dia.resultado === 'green',
                                    loss: dia.resultado === 'loss',
                                    pending: !dia.resultado,
                                }"
                            >
                                <div class="day-header">
                                    <span class="day-number"
                                        >Dia {{ dia.dia }}</span
                                    >
                                    <div class="day-status">
                                        <Icon
                                            v-if="dia.resultado === 'green'"
                                            name="ph:check-circle-bold"
                                            class="status-green"
                                        />
                                        <Icon
                                            v-else-if="dia.resultado === 'loss'"
                                            name="ph:x-circle-bold"
                                            class="status-loss"
                                        />
                                        <Icon
                                            v-else
                                            name="ph:clock-bold"
                                            class="status-pending"
                                        />
                                    </div>
                                </div>

                                <div class="day-content">
                                    <div class="banca-info">
                                        <span class="banca-label">Banca</span>
                                        <span class="banca-value"
                                            >R$
                                            {{
                                                dia.bancaInicial.toFixed(2)
                                            }}</span
                                        >
                                    </div>

                                    <div class="targets">
                                        <div
                                            class="target-item win"
                                            @click="startEditing(index, 'win')"
                                        >
                                            <span class="target-label">
                                                <Icon name="ph:arrow-up-bold" />
                                                Win
                                            </span>
                                            <span
                                                class="target-value"
                                                v-if="
                                                    !(
                                                        editing.index ===
                                                            index &&
                                                        editing.field === 'win'
                                                    )
                                                "
                                            >
                                                R$ {{ dia.stopWin.toFixed(2) }}
                                            </span>
                                            <input
                                                v-if="
                                                    editing.index === index &&
                                                    editing.field === 'win'
                                                "
                                                v-model.number="editValue"
                                                type="number"
                                                class="target-input"
                                                @blur="finishEditing(index)"
                                                @keyup.enter="
                                                    finishEditing(index)
                                                "
                                                @keyup.esc="cancelEditing"
                                            />
                                        </div>

                                        <div
                                            class="target-item loss"
                                            @click="startEditing(index, 'loss')"
                                        >
                                            <span class="target-label">
                                                <Icon
                                                    name="ph:arrow-down-bold"
                                                />
                                                Loss
                                            </span>
                                            <span
                                                class="target-value"
                                                v-if="
                                                    !(
                                                        editing.index ===
                                                            index &&
                                                        editing.field === 'loss'
                                                    )
                                                "
                                            >
                                                R$ {{ dia.stopLoss.toFixed(2) }}
                                            </span>
                                            <input
                                                v-if="
                                                    editing.index === index &&
                                                    editing.field === 'loss'
                                                "
                                                v-model.number="editValue"
                                                type="number"
                                                class="target-input"
                                                @blur="finishEditing(index)"
                                                @keyup.enter="
                                                    finishEditing(index)
                                                "
                                                @keyup.esc="cancelEditing"
                                            />
                                        </div>
                                    </div>

                                    <div class="day-actions">
                                        <button
                                            @click="
                                                setResultado(index, 'green')
                                            "
                                            class="action-button green"
                                            :class="{
                                                active:
                                                    dia.resultado === 'green',
                                            }"
                                        >
                                            <Icon name="ph:check-bold" />
                                            Green
                                        </button>
                                        <button
                                            @click="setResultado(index, 'loss')"
                                            class="action-button loss"
                                            :class="{
                                                active:
                                                    dia.resultado === 'loss',
                                            }"
                                        >
                                            <Icon name="ph:x-bold" />
                                            Loss
                                        </button>
                                    </div>

                                    <div class="day-final">
                                        <span class="final-label"
                                            >Saldo Final</span
                                        >
                                        <span
                                            class="final-value"
                                            :class="dia.resultado"
                                        >
                                            R$ {{ dia.finalBanca.toFixed(2) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Empty State -->
                <section v-else class="empty-state">
                    <div class="empty-content">
                        <div class="empty-icon">
                            <Icon name="ph:chart-bar-bold" />
                        </div>
                        <h3>Configure sua Gestão</h3>
                        <p>
                            Preencha os parâmetros acima e clique em "Calcular
                            Gestão" para visualizar sua estratégia de 30 dias
                        </p>
                    </div>
                </section>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
useHead({
    title: "Gestão de Banca - Rainha da Bet",
});

// Dados do componente
const bancaInicial = ref(1000);
const metaDiaria = ref(5);
const stopLoss = ref(10);
const resultados = ref<any[]>([]);
const editing = ref({
    index: -1,
    field: null as string | null,
});
const editValue = ref(0);
const dataKey = "irmandade_gestao_banca_data";
const savedDate = ref<Date | null>(null);

// Computed properties
const getLucroClass = computed(() => {
    if (!resultados.value.length) return "";
    const lucro =
        resultados.value[resultados.value.length - 1].finalBanca -
        bancaInicial.value;
    return lucro >= 0 ? "positive" : "negative";
});

const savedDateInfo = computed(() => {
    if (!savedDate.value) return null;

    const now = new Date();
    const saved = new Date(savedDate.value);
    const daysDiff = Math.floor(
        (now.getTime() - saved.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = 30 - daysDiff;

    const formattedDate = saved.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return {
        date: formattedDate,
        daysRemaining,
        daysDiff,
    };
});

// Métodos
const calcular = () => {
    if (!bancaInicial.value || !metaDiaria.value || !stopLoss.value) {
        alert("Por favor, preencha todos os campos");
        return;
    }

    if (resultados.value.length > 0) {
        if (
            confirm(
                "Você já possui uma gestão em andamento. Deseja criar uma nova e substituir a atual?",
            )
        ) {
            performCalculation();
        }
    } else {
        performCalculation();
    }
};

const performCalculation = () => {
    resultados.value = [];
    savedDate.value = null;
    let bancaAtual = bancaInicial.value;

    for (let i = 1; i <= 30; i++) {
        const stopWin = bancaAtual * (metaDiaria.value / 100);
        const stopLossValue = bancaAtual * (stopLoss.value / 100);

        resultados.value.push({
            dia: i,
            bancaInicial: bancaAtual,
            stopWin: stopWin,
            stopLoss: stopLossValue,
            finalBanca: bancaAtual + stopWin,
            resultado: null,
        });

        bancaAtual += stopWin;
    }

    saveData();
};

const setResultado = (index: number, resultado: string) => {
    if (index < 0 || index >= resultados.value.length) return;

    const dia = resultados.value[index];
    dia.resultado = resultado;

    if (resultado === "green") {
        dia.finalBanca = dia.bancaInicial + dia.stopWin;
    } else if (resultado === "loss") {
        dia.finalBanca = dia.bancaInicial - dia.stopLoss;
    }

    for (let i = index + 1; i < resultados.value.length; i++) {
        const diaAnterior = resultados.value[i - 1];
        const diaAtual = resultados.value[i];

        diaAtual.bancaInicial = diaAnterior.finalBanca;
        diaAtual.stopWin = diaAtual.bancaInicial * (metaDiaria.value / 100);
        diaAtual.stopLoss = diaAtual.bancaInicial * (stopLoss.value / 100);

        if (diaAtual.resultado === "green") {
            diaAtual.finalBanca = diaAtual.bancaInicial + diaAtual.stopWin;
        } else if (diaAtual.resultado === "loss") {
            diaAtual.finalBanca = diaAtual.bancaInicial - diaAtual.stopLoss;
        } else {
            diaAtual.finalBanca = diaAtual.bancaInicial + diaAtual.stopWin;
        }
    }

    saveData();
};

const startEditing = (index: number, field: string) => {
    editing.value = { index, field };
    editValue.value =
        field === "win"
            ? resultados.value[index].stopWin
            : resultados.value[index].stopLoss;
};

const finishEditing = (index: number) => {
    if (editing.value.index === -1) return;

    const dia = resultados.value[index];
    if (editing.value.field === "win") {
        dia.stopWin = editValue.value;
    } else if (editing.value.field === "loss") {
        dia.stopLoss = editValue.value;
    }

    if (dia.resultado === "green") {
        dia.finalBanca = dia.bancaInicial + dia.stopWin;
    } else if (dia.resultado === "loss") {
        dia.finalBanca = dia.bancaInicial - dia.stopLoss;
    }

    updateFollowingDays(index);

    editing.value = { index: -1, field: null };

    saveData();
};

const cancelEditing = () => {
    editing.value = { index: -1, field: null };
};

const updateFollowingDays = (fromIndex: number) => {
    for (let i = fromIndex + 1; i < resultados.value.length; i++) {
        const diaAnterior = resultados.value[i - 1];
        const diaAtual = resultados.value[i];

        diaAtual.bancaInicial = diaAnterior.finalBanca;
        diaAtual.stopWin = diaAtual.bancaInicial * (metaDiaria.value / 100);
        diaAtual.stopLoss = diaAtual.bancaInicial * (stopLoss.value / 100);

        if (diaAtual.resultado === "green") {
            diaAtual.finalBanca = diaAtual.bancaInicial + diaAtual.stopWin;
        } else if (diaAtual.resultado === "loss") {
            diaAtual.finalBanca = diaAtual.bancaInicial - diaAtual.stopLoss;
        } else {
            diaAtual.finalBanca = diaAtual.bancaInicial + diaAtual.stopWin;
        }
    }
};

// Métodos de persistência
const saveData = () => {
    const now = new Date();
    const dataToSave = {
        bancaInicial: bancaInicial.value,
        metaDiaria: metaDiaria.value,
        stopLoss: stopLoss.value,
        resultados: resultados.value,
        createdAt: savedDate.value
            ? savedDate.value.toISOString()
            : now.toISOString(),
        updatedAt: now.toISOString(),
    };

    localStorage.setItem(dataKey, JSON.stringify(dataToSave));

    if (!savedDate.value) {
        savedDate.value = now;
    }
};

const loadData = () => {
    try {
        const savedData = localStorage.getItem(dataKey);
        if (!savedData) return false;

        const parsedData = JSON.parse(savedData);

        const createdAt = new Date(parsedData.createdAt);
        const now = new Date();
        const daysDiff = Math.floor(
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff >= 30) {
            localStorage.removeItem(dataKey);
            return false;
        }

        bancaInicial.value = parsedData.bancaInicial || 1000;
        metaDiaria.value = parsedData.metaDiaria || 5;
        stopLoss.value = parsedData.stopLoss || 10;
        resultados.value = parsedData.resultados || [];
        savedDate.value = new Date(parsedData.createdAt);

        return true;
    } catch (error) {
        console.error("Erro ao carregar dados salvos:", error);
        return false;
    }
};

const clearSavedData = () => {
    localStorage.removeItem(dataKey);
    resultados.value = [];
    savedDate.value = null;
};

// Carregar dados ao montar o componente
onMounted(() => {
    loadData();
});
</script>

<style scoped>
/* Base Styles */
.gestao-page {
    min-height: 100vh;
    background-color: #000000;
    color: white;
    font-family: "Manrope", "Space Grotesk", sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background-color: #0a0a0a;
    border-bottom: 1px solid #222222;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-logo {
    height: 36px;
    width: auto;
}

.btn-back {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: transparent;
    border: 1px solid #333333;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
}

.btn-back:hover {
    border-color: #fb65a6;
    color: #fb65a6;
}

.main-content {
    padding: 2rem;
    position: relative;
    min-height: calc(100vh - 73px);
}

/* Animated Background */
.animated-bg {
    position: fixed;
    top: 73px;
    left: 0;
    width: 100%;
    height: calc(100% - 73px);
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.gradient-sphere {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.2;
    animation: float 20s infinite ease-in-out;
}

.sphere-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, #fb65a6 0%, transparent 70%);
    top: -300px;
    right: -200px;
}

.sphere-2 {
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, #ff2243 0%, transparent 70%);
    bottom: -400px;
    left: -300px;
    animation-delay: -5s;
}

.sphere-3 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #ff9ec8 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -10s;
}

@keyframes float {
    0%,
    100% {
        transform: translate(0, 0) scale(1);
    }
    33% {
        transform: translate(50px, -50px) scale(1.1);
    }
    66% {
        transform: translate(-30px, 30px) scale(0.9);
    }
}

/* Content Wrapper */
.content-wrapper {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
}

/* Header Section */
.header-section {
    padding: 40px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 30px;
}

.page-title {
    font-size: 42px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 8px;
}

.gradient-text {
    color: #fb65a6;
}

.page-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
}

/* Stats Preview */
.stats-preview {
    display: flex;
    gap: 20px;
}

.stat-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 16px 24px;
    transition: all 0.3s ease;
}

.stat-item:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
}

.stat-label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
}

.stat-value.positive {
    color: #10b981;
}

.stat-value.negative {
    color: #ef4444;
}

/* Calculator Section */
.calculator-section {
    padding: 40px 0;
}

.calculator-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
}

.calculator-card {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 40px;
    position: relative;
    overflow: hidden;
}

.calculator-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #fb65a6, transparent);
    animation: shimmer 3s infinite;
}

@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%);
    }
    50% {
        transform: translateX(100%);
    }
}

.card-header {
    margin-bottom: 30px;
}

.card-header h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
}

.card-subtitle {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
}

/* Input Grid */
.input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 30px;
    margin-bottom: 30px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.input-label {
    display: flex;
    align-items: center;
    gap: 10px;
}

.input-label span {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.label-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.banca-icon {
    background-color: rgba(251, 101, 166, 0.2);
    color: #fb65a6;
}

.meta-icon {
    background-color: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.loss-icon {
    background-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.input-field-container {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(30, 30, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s ease;
}

.input-field-container:focus-within {
    border-color: #fb65a6;
}

.input-prefix,
.input-suffix {
    padding: 0 15px;
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.2);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.custom-input {
    flex: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 18px;
    font-weight: 500;
    padding: 15px;
    width: 100%;
    text-align: center;
}

.custom-input:focus {
    outline: none;
}

.custom-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.custom-input::-webkit-outer-spin-button,
.custom-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.custom-input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}

.input-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
}

/* Calculate Button */
.calculate-button {
    width: 100%;
    padding: 18px 30px;
    background: linear-gradient(135deg, #fb65a6 0%, #e2549a 100%);
    border: none;
    border-radius: 16px;
    color: #000000;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.calculate-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(251, 101, 166, 0.4);
}

.button-glow {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 40px;
    background: radial-gradient(
        ellipse at center,
        rgba(251, 101, 166, 0.6) 0%,
        transparent 70%
    );
    filter: blur(30px);
}

/* Tips Card */
.tips-card {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 30px;
}

.tips-card h3 {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 24px;
    color: #fb65a6;
}

.tips-grid {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.tip-item {
    display: flex;
    gap: 16px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    transition: all 0.3s ease;
}

.tip-item:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(5px);
}

.tip-icon {
    width: 48px;
    height: 48px;
    background: rgba(251, 101, 166, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fb65a6;
    font-size: 22px;
}

.tip-content h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
}

.tip-content p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.5;
}

/* Results Section */
.results-section {
    padding: 40px 0;
}

.results-container {
    position: relative;
    z-index: 1;
}

/* Data Status */
.data-status {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 30px;
    position: relative;
    overflow: hidden;
}

.data-status::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #10b981, transparent);
}

.status-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 20px;
}

.status-info {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 24px;
    color: #10b981;
}

.status-info div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.status-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
}

.status-value {
    font-size: 16px;
    font-weight: 600;
    color: white;
}

.status-expiry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 100px;
    font-size: 14px;
    color: #fbbf24;
}

.clear-data-btn {
    padding: 10px 18px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    color: #ef4444;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.clear-data-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
}

/* Summary Cards */
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.summary-card {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: all 0.3s ease;
}

.summary-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.summary-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
}

.summary-card.initial .summary-icon {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.summary-card.final .summary-icon {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
}

.summary-card.profit.positive .summary-icon {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.summary-card.profit.negative .summary-icon {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.summary-card.roi .summary-icon {
    background: rgba(251, 191, 36, 0.1);
    color: #fbbf24;
}

.summary-content {
    flex: 1;
}

.summary-label {
    display: block;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
}

.summary-value {
    font-size: 22px;
    font-weight: 700;
}

.summary-card.positive .summary-value {
    color: #10b981;
}

.summary-card.negative .summary-value {
    color: #ef4444;
}

/* Days Grid */
.days-header {
    text-align: center;
    margin-bottom: 30px;
}

.days-header h2 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
}

.days-header p {
    color: rgba(255, 255, 255, 0.6);
}

.days-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
}

.day-card {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.3s ease;
}

.day-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.day-card.green {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.05);
}

.day-card.loss {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
}

.day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.day-number {
    font-size: 18px;
    font-weight: 600;
}

.day-status {
    font-size: 22px;
}

.status-green {
    color: #10b981;
}

.status-loss {
    color: #ef4444;
}

.status-pending {
    color: rgba(255, 255, 255, 0.4);
}

.day-content {
    padding: 20px;
}

.banca-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    margin-bottom: 16px;
}

.banca-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
}

.banca-value {
    font-size: 18px;
    font-weight: 600;
}

/* Targets */
.targets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
}

.target-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.target-item:hover {
    background: rgba(255, 255, 255, 0.05);
}

.target-item.win:hover {
    background: rgba(16, 185, 129, 0.1);
}

.target-item.loss:hover {
    background: rgba(239, 68, 68, 0.1);
}

.target-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
}

.target-item.win .target-label {
    color: #10b981;
}

.target-item.loss .target-label {
    color: #ef4444;
}

.target-value {
    font-size: 16px;
    font-weight: 600;
}

.target-input {
    width: 100%;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    font-size: 16px;
    font-weight: 600;
}

.target-input:focus {
    outline: none;
    border-color: #fb65a6;
}

/* Day Actions */
.day-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
}

.action-button {
    padding: 10px 16px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.3s ease;
}

.action-button.green {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.action-button.green:hover,
.action-button.green.active {
    background: #10b981;
    color: white;
}

.action-button.loss {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.action-button.loss:hover,
.action-button.loss.active {
    background: #ef4444;
    color: white;
}

/* Day Final */
.day-final {
    text-align: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
}

.final-label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 4px;
}

.final-value {
    font-size: 20px;
    font-weight: 700;
}

.final-value.green {
    color: #10b981;
}

.final-value.loss {
    color: #ef4444;
}

/* Empty State */
.empty-state {
    padding: 80px 20px;
    text-align: center;
}

.empty-content {
    max-width: 500px;
    margin: 0 auto;
}

.empty-icon {
    width: 120px;
    height: 120px;
    margin: 0 auto 30px;
    background: rgba(251, 101, 166, 0.1);
    border: 2px solid rgba(251, 101, 166, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 50px;
    color: #fb65a6;
}

.empty-content h3 {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 12px;
}

.empty-content p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
    .calculator-container {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .main-content {
        padding: 1rem;
    }

    .header {
        padding: 12px 16px;
    }

    .header-logo {
        height: 32px;
    }

    .btn-back {
        padding: 8px 14px;
        font-size: 13px;
    }

    .page-title {
        font-size: 28px;
    }

    .header-container {
        flex-direction: column;
        text-align: center;
    }

    .stats-preview {
        width: 100%;
        justify-content: center;
    }

    .calculator-card {
        padding: 24px;
    }

    .days-header h2 {
        font-size: 22px;
    }

    .days-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .day-card {
        border-radius: 14px;
    }

    .day-content {
        padding: 14px;
    }

    .day-header {
        padding: 12px 14px;
    }

    .day-number {
        font-size: 15px;
    }

    .banca-info {
        padding: 10px 12px;
    }

    .banca-label {
        font-size: 12px;
    }

    .banca-value {
        font-size: 14px;
    }

    .target-item {
        padding: 8px 10px;
    }

    .target-label {
        font-size: 11px;
    }

    .target-value {
        font-size: 13px;
    }

    .action-button {
        padding: 8px 10px;
        font-size: 12px;
    }

    .final-value {
        font-size: 16px;
    }

    .status-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }

    .status-info {
        justify-content: center;
    }

    .clear-data-btn {
        width: 100%;
        justify-content: center;
    }

    .summary-cards {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .summary-card {
        padding: 16px;
        flex-direction: column;
        text-align: center;
        gap: 12px;
    }

    .summary-icon {
        width: 48px;
        height: 48px;
        font-size: 22px;
    }

    .summary-value {
        font-size: 18px;
    }
}

@media (max-width: 480px) {
    .days-grid {
        gap: 10px;
    }

    .day-content {
        padding: 12px;
    }

    .day-header {
        padding: 10px 12px;
    }

    .day-number {
        font-size: 14px;
    }

    .banca-value {
        font-size: 13px;
    }

    .target-value {
        font-size: 12px;
    }

    .action-button {
        padding: 6px 8px;
        font-size: 11px;
    }

    .final-value {
        font-size: 14px;
    }
}
</style>
