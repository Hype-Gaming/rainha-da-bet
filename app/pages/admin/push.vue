<template>
    <AdminPasswordGate v-if="needsLogin" @authed="loadAll" />

    <div class="adm-page adm-scroll">
        <div class="adm-aurora"></div>
        <div class="adm-wrap">
            <header class="adm-topbar adm-fade-up">
                <div class="adm-logo">
                    <Icon name="ph:bell-ringing-bold" class="adm-logo-icon" />
                    <span>Notificações — Rainha da Bet</span>
                </div>
                <div class="adm-topbar-right">
                    <NuxtLink to="/admin" class="adm-btn-ghost">
                        <Icon name="ph:arrow-left-bold" /> Dashboard
                    </NuxtLink>
                </div>
            </header>

            <!-- Aviso de push não configurado -->
            <section v-if="stats && !stats.configured" class="adm-panel adm-fade-up">
                <p class="adm-hint adm-warn">
                    <Icon name="ph:warning-bold" />
                    Push desativado: faltam VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
                    no .env do servidor.
                </p>
            </section>

            <!-- Compor -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:paper-plane-tilt-bold" /> Nova notificação</h2>
                    <span v-if="stats" class="adm-muted-txt small">
                        {{ stats.total }} dispositivo(s) inscrito(s)
                    </span>
                </div>

                <div class="adm-field">
                    <label for="title">Título</label>
                    <input
                        id="title"
                        v-model="title"
                        type="text"
                        maxlength="60"
                        class="adm-input"
                        placeholder="Ex: Sinal liberado! 🚀"
                    />
                </div>

                <div class="adm-field">
                    <label for="message">Mensagem</label>
                    <textarea
                        id="message"
                        v-model="message"
                        rows="3"
                        maxlength="180"
                        class="adm-textarea"
                        placeholder="Ex: Nova entrada disponível no Bac Bo. Abra o app agora!"
                    ></textarea>
                </div>

                <div class="adm-field">
                    <label for="url">Link ao clicar (opcional)</label>
                    <input
                        id="url"
                        v-model="url"
                        type="text"
                        class="adm-input"
                        placeholder="/  (padrão: abre o app na home)"
                    />
                    <p class="adm-hint">
                        Precisa ser um caminho do próprio site começando com "/" (ex:
                        "/aulas"). Qualquer outro valor é ignorado e vira "/".
                    </p>
                </div>

                <div class="adm-field">
                    <label>Quando enviar</label>
                    <div class="adm-radios">
                        <label
                            ><input v-model="mode" type="radio" value="now" />
                            Agora</label
                        >
                        <label
                            ><input v-model="mode" type="radio" value="once" />
                            Uma vez, em</label
                        >
                        <label
                            ><input v-model="mode" type="radio" value="daily" />
                            Todo dia às</label
                        >
                    </div>
                </div>

                <div v-if="mode === 'once'" class="adm-field">
                    <label for="datetime">Data e horário</label>
                    <input
                        id="datetime"
                        v-model="datetime"
                        type="datetime-local"
                        class="adm-input"
                    />
                </div>

                <div v-if="mode === 'daily'" class="adm-field">
                    <label for="time">Horário (todo dia)</label>
                    <input id="time" v-model="timeOfDay" type="time" class="adm-input" />
                </div>

                <button
                    class="adm-btn-primary"
                    :disabled="sending || !title.trim() || !message.trim()"
                    @click="submit"
                >
                    <Icon name="ph:paper-plane-tilt-bold" />
                    {{ submitLabel }}
                </button>

                <div v-if="lastResult" class="adm-result">
                    <p class="adm-hint">
                        Enviadas: <strong>{{ lastResult.sent }}</strong> de
                        <strong>{{ lastResult.total }}</strong> inscrição(ões).
                    </p>
                    <p v-if="lastResult.failed" class="adm-hint">
                        {{ lastResult.failed }} falha(s) no envio<span v-if="lastResult.removed">,
                            sendo {{ lastResult.removed }} inscrição(ões) morta(s) removida(s)
                            automaticamente</span>.
                    </p>
                </div>
            </section>

            <!-- Agendamentos -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:calendar-check-bold" /> Agendamentos</h2>
                    <button class="adm-btn-ghost" :disabled="loading" @click="loadAll">
                        <Icon name="ph:arrow-clockwise-bold" /> Atualizar
                    </button>
                </div>

                <p v-if="!scheduled.length" class="adm-hint">
                    Nenhum agendamento.
                </p>

                <ul v-else class="adm-req-list">
                    <li v-for="job in scheduled" :key="job.id" class="adm-req">
                        <div class="adm-req-info">
                            <strong>{{ job.title }}</strong>
                            <span class="adm-muted-txt">{{ job.body }}</span>
                            <span class="adm-muted-txt small">
                                {{ job.type === "daily" ? "Todo dia" : "Uma vez" }}
                                · próximo: {{ fmtDate(job.nextRunAt) }} ·
                                {{ job.status }}
                            </span>
                        </div>
                        <div class="adm-req-actions">
                            <button
                                class="adm-btn-reject"
                                :disabled="busy === job.id"
                                @click="cancelJob(job.id)"
                            >
                                <Icon name="ph:trash-bold" /> Cancelar
                            </button>
                        </div>
                    </li>
                </ul>
            </section>

            <!-- Inscritos -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2>
                        <Icon name="ph:devices-bold" /> Inscritos ({{
                            subscribers.length
                        }})
                    </h2>
                </div>

                <p v-if="!subscribers.length" class="adm-hint">
                    Ninguém ativou as notificações ainda.
                </p>

                <ul v-else class="adm-req-list">
                    <li v-for="s in subscribers" :key="s.id" class="adm-req">
                        <div class="adm-req-info">
                            <strong>{{ s.name || s.email || "Anônimo" }}</strong>
                            <span v-if="s.email" class="adm-muted-txt">{{ s.email }}</span>
                            <span class="adm-muted-txt small">
                                {{ s.provider }} · desde {{ fmtDate(s.createdAt) }}
                            </span>
                        </div>
                    </li>
                </ul>
            </section>
        </div>

        <Teleport to="body">
            <div v-if="toast" class="adm-toast" :class="toastType">{{ toast }}</div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });

interface PushStats {
    configured: boolean;
    total: number;
    withEmail: number;
}

interface DispatchResult {
    sent: number;
    failed: number;
    removed: number;
    total: number;
}

interface ScheduledJob {
    id: string;
    title: string;
    body: string;
    url: string;
    type: "once" | "daily";
    time: string | null;
    nextRunAt: string | null;
    status: string;
    lastSentAt: string | null;
}

interface Subscriber {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    provider: string;
    createdAt: string | null;
    updatedAt: string | null;
}

// needsLogin é um computed do useAdmin — NÃO declare um ref local para ele.
const { adminFetch, needsLogin } = useAdmin();

const loading = ref(false);
const sending = ref(false);
const busy = ref<string | null>(null);

const title = ref("");
const message = ref("");
const url = ref("");
const mode = ref<"now" | "once" | "daily">("now");
const datetime = ref("");
const timeOfDay = ref("");

const stats = ref<PushStats | null>(null);
const scheduled = ref<ScheduledJob[]>([]);
const subscribers = ref<Subscriber[]>([]);
const lastResult = ref<DispatchResult | null>(null);

const toast = ref("");
const toastType = ref<"ok" | "error">("ok");

const submitLabel = computed(() => {
    if (sending.value) return "Enviando...";
    if (mode.value === "now") return "Enviar agora";
    return "Agendar";
});

const showToast = (msg: string, type: "ok" | "error" = "ok") => {
    toast.value = msg;
    toastType.value = type;
    setTimeout(() => (toast.value = ""), 3500);
};

const fmtDate = (value: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

// Monta o momento do primeiro disparo em ISO, a partir do fuso local do admin.
// 'once' usa o datetime-local direto; 'daily' usa o próximo horário futuro.
const buildRunAt = (): string | null => {
    if (mode.value === "once") {
        if (!datetime.value) return null;
        const d = new Date(datetime.value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    if (!timeOfDay.value) return null;
    const [h, m] = timeOfDay.value.split(":").map(Number);
    if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return null;

    const next = new Date();
    next.setSeconds(0, 0);
    next.setHours(h, m);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return next.toISOString();
};

const loadAll = async () => {
    loading.value = true;
    try {
        const [s, j, subs] = await Promise.all([
            adminFetch<PushStats>("/api/admin/push/stats"),
            adminFetch<ScheduledJob[]>("/api/admin/push/scheduled"),
            adminFetch<Subscriber[]>("/api/admin/push/subscriptions"),
        ]);
        stats.value = s;
        scheduled.value = j;
        subscribers.value = subs;
    } catch (err: any) {
        // O adminFetch já derruba a sessão no 401, o que faz needsLogin virar
        // true sozinho e o AdminPasswordGate aparecer.
        const status = err?.status || err?.statusCode;
        if (status !== 401) {
            showToast("Falha ao carregar os dados.", "error");
        }
    } finally {
        loading.value = false;
    }
};

const submit = async () => {
    sending.value = true;
    lastResult.value = null;
    try {
        if (mode.value === "now") {
            const res = await adminFetch<DispatchResult>("/api/admin/push/send", {
                method: "POST",
                body: {
                    title: title.value,
                    body: message.value,
                    url: url.value,
                },
            });
            lastResult.value = res;
            showToast(`Enviada para ${res.sent} dispositivo(s).`);
        } else {
            const runAt = buildRunAt();
            if (!runAt) {
                showToast("Informe a data/horário do agendamento.", "error");
                return;
            }
            await adminFetch("/api/admin/push/scheduled", {
                method: "POST",
                body: {
                    title: title.value,
                    body: message.value,
                    url: url.value,
                    type: mode.value,
                    runAt,
                    time: mode.value === "daily" ? timeOfDay.value : null,
                },
            });
            showToast("Agendamento criado.");
        }

        title.value = "";
        message.value = "";
        url.value = "";
        await loadAll();
    } catch (err: any) {
        showToast(err?.data?.message || "Falha ao enviar.", "error");
    } finally {
        sending.value = false;
    }
};

const cancelJob = async (id: string) => {
    busy.value = id;
    try {
        await adminFetch(`/api/admin/push/scheduled/${id}`, { method: "DELETE" });
        showToast("Agendamento cancelado.");
        await loadAll();
    } catch {
        showToast("Falha ao cancelar.", "error");
    } finally {
        busy.value = null;
    }
};

onMounted(() => {
    if (!needsLogin.value) loadAll();
});

useHead({ title: "Notificações - Admin" });
</script>

<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.adm-page { min-height: 100vh; background: var(--adm-bg); color: var(--adm-text); position: relative; font-family: "Manrope", sans-serif; }
.adm-wrap { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 24px 28px 80px; display: flex; flex-direction: column; gap: 22px; }
.adm-topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin: -24px -28px 4px; padding: 18px 28px; background: rgba(7, 9, 15, 0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--adm-border-soft); }
.adm-logo { display: flex; align-items: center; gap: 11px; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
.adm-logo span { background: linear-gradient(92deg, #fff 30%, #ffc2de 75%, var(--adm-accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.adm-logo-icon { font-size: 22px; color: #fff; background: var(--adm-grad-accent); border-radius: 10px; padding: 7px; box-shadow: 0 6px 18px rgba(251, 101, 166, 0.35); }
@media (max-width: 560px) { .adm-topbar { margin: -24px -28px 4px; padding: 14px 18px; } }
.adm-btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: var(--adm-panel); border: 1px solid var(--adm-border); color: var(--adm-muted); border-radius: 9px; padding: 8px 13px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s var(--adm-ease); }
.adm-btn-ghost:hover:not(:disabled) { border-color: var(--adm-accent); color: var(--adm-accent); }
.adm-panel { background: var(--adm-panel); border: 1px solid var(--adm-border-soft); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 14px; }
.adm-panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.adm-panel-head h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
.adm-panel-head h2 :deep(svg) { color: var(--adm-accent); }
.adm-hint { color: var(--adm-muted); font-size: 13.5px; margin: 0; line-height: 1.5; }
.adm-warn { display: flex; align-items: center; gap: 8px; color: var(--adm-red); }
.adm-field { display: flex; flex-direction: column; gap: 6px; }
.adm-field label { font-size: 13px; font-weight: 600; color: var(--adm-muted); }
.adm-input, .adm-textarea { background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft); border-radius: 10px; color: var(--adm-text); padding: 12px 14px; font-size: 14px; outline: none; font-family: inherit; }
.adm-textarea { resize: vertical; }
.adm-input:focus, .adm-textarea:focus { border-color: var(--adm-accent); }
.adm-radios { display: flex; flex-wrap: wrap; gap: 16px; }
.adm-radios label { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 500; color: var(--adm-text); cursor: pointer; }
.adm-btn-primary { align-self: flex-start; display: inline-flex; align-items: center; gap: 7px; background: var(--adm-accent); color: #1a0410; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
.adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-result { display: flex; flex-direction: column; gap: 2px; }
.adm-req-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.adm-req { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft); border-radius: 10px; padding: 14px; flex-wrap: wrap; }
.adm-req-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.adm-req-info strong { font-size: 14px; word-break: break-all; }
.adm-muted-txt { color: var(--adm-muted); font-size: 13px; word-break: break-word; }
.adm-muted-txt.small { font-size: 12px; }
.adm-req-actions { display: flex; gap: 8px; }
.adm-btn-reject { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--adm-red); color: #2a0608; }
.adm-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 10px; font-size: 14px; z-index: 10000; }
.adm-toast.ok { background: rgba(45, 212, 167, 0.15); border: 1px solid var(--adm-green); color: var(--adm-green); }
.adm-toast.error { background: rgba(255, 93, 108, 0.15); border: 1px solid var(--adm-red); color: var(--adm-red); }
</style>
