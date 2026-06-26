<template>
    <AdminPasswordGate v-if="needsLogin" @authed="loadRequests" />

    <div class="adm-page adm-scroll">
        <div class="adm-aurora"></div>
        <div class="adm-wrap">
            <header class="adm-topbar adm-fade-up">
                <div class="adm-logo">
                    <Icon name="ph:plug-bold" class="adm-logo-icon" />
                    <span>Liberar acesso — Rainha da Bet</span>
                </div>
                <div class="adm-topbar-right">
                    <NuxtLink to="/admin" class="adm-btn-ghost">
                        <Icon name="ph:arrow-left-bold" /> Dashboard
                    </NuxtLink>
                </div>
            </header>

            <!-- Liberação manual em lote -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:lock-open-bold" /> Liberação manual</h2>
                </div>
                <p class="adm-hint">
                    Cole um ou mais e-mails (separados por vírgula, espaço ou linha).
                    Cada um vira assinatura <strong>ativa</strong>, igual ao webhook.
                </p>
                <textarea
                    v-model="emailsText"
                    class="adm-textarea"
                    rows="5"
                    placeholder="cliente1@email.com&#10;cliente2@email.com"
                ></textarea>
                <button class="adm-btn-primary" :disabled="approving || !emailsText.trim()" @click="approveBatch">
                    <Icon name="ph:check-bold" />
                    {{ approving ? "Liberando..." : "Liberar acesso" }}
                </button>

                <ul v-if="results.length" class="adm-results">
                    <li v-for="r in results" :key="r.email" :class="r.ok ? 'ok' : 'err'">
                        <Icon :name="r.ok ? 'ph:check-circle-bold' : 'ph:x-circle-bold'" />
                        {{ r.email }} <span v-if="!r.ok">— {{ r.error }}</span>
                    </li>
                </ul>
            </section>

            <!-- Fila de pedidos -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:queue-bold" /> Pedidos de liberação</h2>
                    <button class="adm-btn-ghost" :disabled="loadingReqs" @click="loadRequests">
                        <Icon name="ph:arrow-clockwise-bold" /> Atualizar
                    </button>
                </div>

                <p v-if="!requests.length && !loadingReqs" class="adm-hint">Nenhum pedido pendente.</p>

                <ul v-else class="adm-req-list">
                    <li v-for="req in requests" :key="req.email" class="adm-req">
                        <div class="adm-req-info">
                            <strong>{{ req.email }}</strong>
                            <span v-if="req.name" class="adm-muted-txt">{{ req.name }}</span>
                            <span class="adm-muted-txt small">{{ fmtDate(req.created_at) }}</span>
                        </div>
                        <div class="adm-req-actions">
                            <button class="adm-btn-approve" :disabled="busy === req.email" @click="approveOne(req.email)">
                                <Icon name="ph:check-bold" /> Aprovar
                            </button>
                            <button class="adm-btn-reject" :disabled="busy === req.email" @click="rejectOne(req.email)">
                                <Icon name="ph:x-bold" /> Recusar
                            </button>
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

interface AccessRequest {
    email: string;
    name: string | null;
    created_at: string | null;
}

const { adminFetch, needsLogin } = useAdmin();

const emailsText = ref("");
const approving = ref(false);
const results = ref<Array<{ email: string; ok: boolean; error?: string }>>([]);

const requests = ref<AccessRequest[]>([]);
const loadingReqs = ref(false);
const busy = ref<string | null>(null);

const toast = ref("");
const toastType = ref<"ok" | "error">("ok");
const showToast = (m: string, t: "ok" | "error" = "ok") => {
    toast.value = m;
    toastType.value = t;
    setTimeout(() => (toast.value = ""), 3000);
};

const fmtDate = (v: string | null) =>
    v ? new Date(v).toLocaleString("pt-BR") : "";

const approveBatch = async () => {
    approving.value = true;
    results.value = [];
    try {
        const res = await adminFetch<{ results: typeof results.value; approved: number }>(
            "/api/admin/subscriptions/approve",
            { method: "POST", body: { emails: emailsText.value } },
        );
        results.value = res.results;
        showToast(`${res.approved} liberado(s).`);
    } catch {
        showToast("Erro ao liberar.", "error");
    } finally {
        approving.value = false;
    }
};

const loadRequests = async () => {
    loadingReqs.value = true;
    try {
        const res = await adminFetch<{ requests: AccessRequest[] }>("/api/admin/requests?status=pending");
        requests.value = res.requests;
    } catch {
        showToast("Erro ao carregar pedidos.", "error");
    } finally {
        loadingReqs.value = false;
    }
};

const approveOne = async (email: string) => {
    busy.value = email;
    try {
        await adminFetch("/api/admin/requests/approve", { method: "POST", body: { email } });
        requests.value = requests.value.filter((r) => r.email !== email);
        showToast(`Acesso liberado para ${email}.`);
    } catch {
        showToast("Erro ao aprovar.", "error");
    } finally {
        busy.value = null;
    }
};

const rejectOne = async (email: string) => {
    busy.value = email;
    try {
        await adminFetch("/api/admin/requests/reject", { method: "POST", body: { email } });
        requests.value = requests.value.filter((r) => r.email !== email);
        showToast(`Pedido de ${email} recusado.`);
    } catch {
        showToast("Erro ao recusar.", "error");
    } finally {
        busy.value = null;
    }
};

onMounted(() => {
    if (!needsLogin.value) loadRequests();
});
useHead({ title: "Liberar acesso - Admin" });
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
.adm-textarea { background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft); border-radius: 10px; color: var(--adm-text); padding: 12px 14px; font-size: 14px; resize: vertical; outline: none; font-family: inherit; }
.adm-textarea:focus { border-color: var(--adm-accent); }
.adm-btn-primary { align-self: flex-start; display: inline-flex; align-items: center; gap: 7px; background: var(--adm-accent); color: #1a0410; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
.adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-results { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.adm-results li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.adm-results li.ok { color: var(--adm-green); }
.adm-results li.err { color: var(--adm-red); }
.adm-req-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.adm-req { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft); border-radius: 10px; padding: 14px; flex-wrap: wrap; }
.adm-req-info { display: flex; flex-direction: column; gap: 2px; }
.adm-req-info strong { font-size: 14px; word-break: break-all; }
.adm-muted-txt { color: var(--adm-muted); font-size: 13px; }
.adm-muted-txt.small { font-size: 12px; }
.adm-req-actions { display: flex; gap: 8px; }
.adm-btn-approve, .adm-btn-reject { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.adm-btn-approve { background: var(--adm-green); color: #052017; }
.adm-btn-reject { background: var(--adm-red); color: #2a0608; }
.adm-btn-approve:disabled, .adm-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 10px; font-size: 14px; z-index: 10000; }
.adm-toast.ok { background: rgba(45, 212, 167, 0.15); border: 1px solid var(--adm-green); color: var(--adm-green); }
.adm-toast.error { background: rgba(255, 93, 108, 0.15); border: 1px solid var(--adm-red); color: var(--adm-red); }
</style>
