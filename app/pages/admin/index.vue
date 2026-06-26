<template>
    <AdminPasswordGate v-if="needsLogin" @authed="refreshAll" />

    <div class="adm-page adm-scroll">
        <div class="adm-aurora"></div>

        <div class="adm-wrap">
            <!-- Topbar -->
            <header class="adm-topbar adm-fade-up">
                <div class="adm-logo">
                    <Icon name="ph:shield-check-bold" class="adm-logo-icon" />
                    <span>Painel Admin — Rainha da Bet</span>
                </div>
                <div class="adm-topbar-right">
                    <NuxtLink to="/admin/webhook" class="adm-btn-ghost">
                        <Icon name="ph:plug-bold" /> Liberar acesso
                    </NuxtLink>
                    <span v-if="adminEmail" class="adm-email">{{ adminEmail }}</span>
                    <button class="adm-btn-ghost" @click="logout">
                        <Icon name="ph:sign-out-bold" /> Sair
                    </button>
                </div>
            </header>

            <!-- Cards -->
            <section class="adm-cards">
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:users-three-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtInt(dTotal) }}</div>
                    <div class="adm-card-lbl">Usuários</div>
                </div>
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:pulse-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtInt(dActive) }}</div>
                    <div class="adm-card-lbl">Ativos 48h</div>
                </div>
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:hand-coins-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtInt(dPix) }}</div>
                    <div class="adm-card-lbl">PIX gerados</div>
                </div>
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:currency-circle-dollar-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtMoney(dValue) }}</div>
                    <div class="adm-card-lbl">Valor total</div>
                </div>
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:percent-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtPct(dConv) }}</div>
                    <div class="adm-card-lbl">Conversão</div>
                </div>
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:user-plus-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtInt(dNew7) }}</div>
                    <div class="adm-card-lbl">Novos 7d</div>
                </div>
                <div class="adm-card adm-fade-up">
                    <Icon name="ph:receipt-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtMoney(dTicket) }}</div>
                    <div class="adm-card-lbl">Ticket médio</div>
                </div>
                <button
                    class="adm-card adm-card-risk adm-fade-up"
                    :class="{ on: riskFilter === 'any' }"
                    @click="toggleRiskCard"
                >
                    <Icon name="ph:warning-octagon-bold" class="adm-card-ic" />
                    <div class="adm-card-val">{{ fmtInt(dRisk) }}</div>
                    <div class="adm-card-lbl">Em risco</div>
                </button>
            </section>

            <!-- Gráfico -->
            <section class="adm-section">
                <AdminActivityChart
                    :days="activityDays"
                    :loading="loadingActivity"
                    :error="activityError"
                />
            </section>

            <!-- Usuários -->
            <section class="adm-section adm-panel" ref="usersSection">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:users-bold" /> Usuários</h2>
                    <button class="adm-btn-ghost" :disabled="exporting" @click="exportCsv">
                        <Icon name="ph:download-simple-bold" /> Exportar CSV
                    </button>
                </div>

                <div class="adm-filters">
                    <div class="adm-search">
                        <Icon name="ph:magnifying-glass-bold" />
                        <input
                            ref="searchInput"
                            v-model="search"
                            type="text"
                            placeholder="Buscar e-mail, nome ou telefone..."
                        />
                    </div>
                    <div class="adm-chips">
                        <button
                            v-for="c in riskChips" :key="c.value"
                            class="adm-chip" :class="{ on: riskFilter === c.value }"
                            @click="setRisk(c.value)"
                        >{{ c.label }}</button>
                    </div>
                    <select v-model="subFilter" class="adm-select">
                        <option value="">Assinatura: todas</option>
                        <option value="paid">Pago</option>
                        <option value="free">Free</option>
                    </select>
                    <select v-model="statusFilter" class="adm-select">
                        <option value="">Status: todos</option>
                        <option value="active">Ativos</option>
                        <option value="blocked">Bloqueados</option>
                    </select>
                    <select v-if="brands.length" v-model="brandFilter" class="adm-select">
                        <option value="">Marca: todas</option>
                        <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
                    </select>
                </div>

                <div class="adm-table-wrap adm-scroll">
                    <table class="adm-table">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Telefone</th>
                                <th>Tag</th>
                                <th>Contato</th>
                                <th>Assinatura</th>
                                <th>PIX</th>
                                <th>Marca</th>
                                <th>1º acesso</th>
                                <th>Último acesso</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loadingUsers && !users.length">
                                <td colspan="11" class="adm-td-empty">Carregando...</td>
                            </tr>
                            <tr v-else-if="!users.length">
                                <td colspan="11" class="adm-td-empty">Nenhum usuário encontrado.</td>
                            </tr>
                            <tr v-for="u in users" :key="u.email">
                                <td>
                                    <div class="adm-user">
                                        <span class="adm-avatar" :style="avatarStyle(u.email)">
                                            {{ (u.name || u.email).charAt(0).toUpperCase() }}
                                        </span>
                                        <div class="adm-user-info">
                                            <strong>{{ u.name || "—" }}</strong>
                                            <span>{{ u.email }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div v-if="editingPhone === u.email" class="adm-phone-edit">
                                        <input
                                            v-model="phoneInput"
                                            type="text"
                                            placeholder="+55 DDD número"
                                            @keydown.enter="savePhone(u)"
                                            @keydown.esc="editingPhone = null"
                                        />
                                        <button class="adm-icon-btn ok" :disabled="busyEmail === u.email" @click="savePhone(u)">
                                            <Icon name="ph:check-bold" />
                                        </button>
                                        <button class="adm-icon-btn" @click="editingPhone = null">
                                            <Icon name="ph:x-bold" />
                                        </button>
                                    </div>
                                    <div v-else class="adm-phone-cell">
                                        <a v-if="u.phone" :href="waLink(u.phone)" target="_blank" class="adm-wa">
                                            <Icon name="ph:whatsapp-logo-bold" /> {{ u.phone }}
                                        </a>
                                        <span v-else class="adm-faint">—</span>
                                        <button
                                            class="adm-phone-edit-btn"
                                            :title="u.phone ? 'Editar telefone' : 'Adicionar telefone'"
                                            @click="startEditPhone(u)"
                                        >
                                            <Icon :name="u.phone ? 'ph:pencil-simple-bold' : 'ph:plus-bold'" />
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <select
                                        class="adm-tag-select" :class="tagClass(u.risk_tag)"
                                        :value="u.tag_override"
                                        @change="updateTag(u, ($event.target as HTMLSelectElement).value)"
                                    >
                                        <option value="auto">Automática</option>
                                        <option value="risk_24h">24h</option>
                                        <option value="risk_48h">48h+</option>
                                        <option value="risk_no_access">Pago nunca acessou</option>
                                        <option value="none">Sem tag</option>
                                    </select>
                                </td>
                                <td>
                                    <select
                                        class="adm-status-select" :class="`st-${u.contact_status}`"
                                        :value="u.contact_status"
                                        @change="updateStatus(u, ($event.target as HTMLSelectElement).value)"
                                    >
                                        <option value="pendente">Pendente</option>
                                        <option value="contatado">Contatado</option>
                                        <option value="respondeu">Respondeu</option>
                                        <option value="convertido">Convertido</option>
                                        <option value="ignorado">Ignorado</option>
                                    </select>
                                </td>
                                <td>
                                    <span class="adm-pill" :class="u.subscription === 'paid' ? 'pill-paid' : 'pill-free'">
                                        {{ u.subscription === "paid" ? "Pago" : "Free" }}
                                    </span>
                                </td>
                                <td>
                                    <span v-if="u.deposits_count">{{ u.deposits_count }} · {{ fmtMoney(u.deposits_sum) }}</span>
                                    <span v-else class="adm-faint">0</span>
                                </td>
                                <td>{{ u.brand_slug || "—" }}</td>
                                <td class="adm-date">{{ fmtDate(u.first_seen_at) }}</td>
                                <td class="adm-date">{{ fmtDate(u.last_seen_at) }}</td>
                                <td>
                                    <span class="adm-pill" :class="u.blocked ? 'pill-blocked' : 'pill-active'">
                                        {{ u.blocked ? "Bloqueado" : "Ativo" }}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        class="adm-icon-btn"
                                        :title="u.blocked ? 'Desbloquear' : 'Bloquear'"
                                        :disabled="busyEmail === u.email"
                                        @click="askBlock(u)"
                                    >
                                        <Icon :name="u.blocked ? 'ph:lock-open-bold' : 'ph:lock-bold'" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="users.length < usersTotal" class="adm-more">
                    <button class="adm-btn-ghost" :disabled="loadingUsers" @click="fetchUsers(true)">
                        Carregar mais ({{ users.length }}/{{ usersTotal }})
                    </button>
                </div>
            </section>

            <!-- Depósitos -->
            <section class="adm-section adm-panel">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:hand-coins-bold" /> Depósitos</h2>
                </div>
                <div class="adm-table-wrap adm-scroll">
                    <table class="adm-table">
                        <thead>
                            <tr><th>E-mail</th><th>Valor</th><th>Marca</th><th>FTD</th><th>Status</th><th>Data</th></tr>
                        </thead>
                        <tbody>
                            <tr v-if="!deposits.length">
                                <td colspan="6" class="adm-td-empty">Nenhum depósito registrado.</td>
                            </tr>
                            <tr v-for="(d, i) in deposits" :key="i">
                                <td>{{ d.email }}</td>
                                <td>{{ fmtMoney(d.amount) }}</td>
                                <td>{{ d.brand_slug || "—" }}</td>
                                <td>{{ d.is_ftd ? "Sim" : "—" }}</td>
                                <td>{{ d.status || "—" }}</td>
                                <td class="adm-date">{{ fmtDate(d.created_at) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Registrar FTD -->
            <section class="adm-section adm-panel">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:plus-circle-bold" /> Registrar FTD (1º depósito)</h2>
                </div>
                <div class="adm-ftd">
                    <input v-model="ftd.email" type="email" placeholder="email@cliente.com" class="adm-input" />
                    <input v-model.number="ftd.amount" type="number" min="1" step="0.01" placeholder="Valor (R$)" class="adm-input" />
                    <button class="adm-btn-primary" :disabled="savingFtd" @click="registerFtd">
                        <Icon name="ph:check-bold" /> Registrar
                    </button>
                </div>
            </section>
        </div>

        <!-- Modal bloqueio -->
        <Teleport to="body">
            <div v-if="blockTarget" class="adm-modal-overlay" @click.self="blockTarget = null">
                <div class="adm-modal">
                    <Icon :name="blockTarget.blocked ? 'ph:lock-open-bold' : 'ph:lock-bold'" class="adm-modal-ic" />
                    <h3>{{ blockTarget.blocked ? "Desbloquear" : "Bloquear" }} usuário</h3>
                    <p>{{ blockTarget.email }}</p>
                    <div class="adm-modal-actions">
                        <button class="adm-btn-ghost" @click="blockTarget = null">Cancelar</button>
                        <button class="adm-btn-primary" :disabled="busyEmail" @click="confirmBlock">Confirmar</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Toast -->
        <Teleport to="body">
            <div v-if="toast" class="adm-toast" :class="toastType">{{ toast }}</div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });

interface AppUser {
    email: string;
    name: string | null;
    phone: string | null;
    brand_slug: string | null;
    blocked: boolean;
    last_seen_at: string | null;
    first_seen_at: string | null;
    subscription: "paid" | "free";
    deposits_count: number;
    deposits_sum: number;
    risk_tag: "risk_24h" | "risk_48h" | "risk_no_access" | null;
    auto_risk_tag: "risk_24h" | "risk_48h" | "risk_no_access" | null;
    tag_override: "auto" | "none" | "risk_24h" | "risk_48h" | "risk_no_access";
    contact_status: "pendente" | "contatado" | "respondeu" | "convertido" | "ignorado";
}

const { adminFetch, adminEmail, needsLogin, logout } = useAdmin();

// --- Métricas ---
const metrics = reactive({
    totalUsers: 0, active48h: 0, depositsCount: 0, depositsSum: 0,
    newToday: 0, new7d: 0, avgTicket: 0, atRisk: 0, conversionRate: 0,
});
const dTotal = useCountUp(() => metrics.totalUsers);
const dActive = useCountUp(() => metrics.active48h);
const dPix = useCountUp(() => metrics.depositsCount);
const dValue = useCountUp(() => metrics.depositsSum);
const dConv = useCountUp(() => metrics.conversionRate);
const dNew7 = useCountUp(() => metrics.new7d);
const dTicket = useCountUp(() => metrics.avgTicket);
const dRisk = useCountUp(() => metrics.atRisk);

// --- Usuários ---
const users = ref<AppUser[]>([]);
const usersTotal = ref(0);
const brands = ref<string[]>([]);
const loadingUsers = ref(false);
const search = ref("");
const riskFilter = ref("");
const subFilter = ref("");
const statusFilter = ref("");
const brandFilter = ref("");
const PAGE = 50;

const riskChips = [
    { value: "", label: "Todos" },
    { value: "24h", label: "Risco 24h" },
    { value: "48h", label: "Risco 48h+" },
    { value: "no_access", label: "Pago s/ acesso" },
];

// --- Depósitos ---
const deposits = ref<Array<{ email: string; amount: number; brand_slug: string | null; is_ftd: boolean; status: string | null; created_at: string | null }>>([]);

// --- Atividade ---
const activityDays = ref<Array<{ date: string; users: number; deposits: number }>>([]);
const loadingActivity = ref(false);
const activityError = ref<string | null>(null);

// --- FTD ---
const ftd = reactive({ email: "", amount: null as number | null });
const savingFtd = ref(false);

const busyEmail = ref<string | null>(null);
const blockTarget = ref<AppUser | null>(null);
const exporting = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);

// edição manual de telefone
const editingPhone = ref<string | null>(null);
const phoneInput = ref("");
const startEditPhone = (u: AppUser) => {
    editingPhone.value = u.email;
    phoneInput.value = u.phone || "";
};
const savePhone = async (u: AppUser) => {
    busyEmail.value = u.email;
    try {
        const phone = phoneInput.value.trim();
        await adminFetch("/api/admin/users/phone", {
            method: "POST",
            body: { email: u.email, phone },
        });
        u.phone = phone || null;
        editingPhone.value = null;
        showToast("Telefone salvo.");
    } catch {
        showToast("Erro ao salvar telefone.", "error");
    } finally {
        busyEmail.value = null;
    }
};

// --- Toast ---
const toast = ref("");
const toastType = ref<"ok" | "error">("ok");
const showToast = (msg: string, type: "ok" | "error" = "ok") => {
    toast.value = msg;
    toastType.value = type;
    setTimeout(() => (toast.value = ""), 3000);
};

// --- Formatação ---
const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtMoney = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
const fmtDate = (v: string | null) =>
    v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

const avatarStyle = (email: string) => {
    let h = 0;
    for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % 360;
    return { background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 40) % 360} 70% 35%))` };
};

const tagClass = (tag: string | null) =>
    tag === "risk_24h" ? "tag-24" : tag === "risk_48h" ? "tag-48" : tag === "risk_no_access" ? "tag-na" : "tag-none";

const effectiveTag = (ov: string, auto: string | null) =>
    ov === "none" ? null : ov === "auto" ? auto : (ov as AppUser["risk_tag"]);

// --- Fetchers ---
const fetchStats = async () => {
    try {
        const res = await adminFetch<typeof metrics>("/api/admin/stats");
        Object.assign(metrics, res);
    } catch { /* silencioso */ }
};

const fetchUsers = async (append = false) => {
    loadingUsers.value = true;
    try {
        const skip = append ? users.value.length : 0;
        const res = await adminFetch<{ users: AppUser[]; total: number; brands: string[] }>("/api/admin/users", {
            params: {
                search: search.value.trim(),
                risk: riskFilter.value,
                subscription: subFilter.value,
                status: statusFilter.value,
                brand: brandFilter.value,
                skip,
                limit: PAGE,
            },
        });
        users.value = append ? [...users.value, ...res.users] : res.users;
        usersTotal.value = res.total;
        brands.value = res.brands;
    } catch {
        showToast("Erro ao carregar usuários.", "error");
    } finally {
        loadingUsers.value = false;
    }
};

const fetchDeposits = async () => {
    try {
        const res = await adminFetch<{ deposits: typeof deposits.value }>("/api/admin/deposits", { params: { limit: 50 } });
        deposits.value = res.deposits;
    } catch { /* silencioso */ }
};

const fetchActivity = async () => {
    loadingActivity.value = true;
    activityError.value = null;
    try {
        const res = await adminFetch<{ days: typeof activityDays.value }>("/api/admin/activity");
        activityDays.value = res.days;
    } catch {
        activityError.value = "Erro ao carregar atividade.";
    } finally {
        loadingActivity.value = false;
    }
};

const refreshAll = () => Promise.all([fetchStats(), fetchUsers(), fetchDeposits(), fetchActivity()]);

// --- Filtros (debounce na busca) ---
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchUsers(), 300);
});
watch([riskFilter, subFilter, statusFilter, brandFilter], () => fetchUsers());

const setRisk = (v: string) => { riskFilter.value = v; };
const toggleRiskCard = () => {
    riskFilter.value = riskFilter.value === "any" ? "" : "any";
    const el = document.querySelector(".adm-table-wrap");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
};

// --- Ações de linha ---
const updateStatus = async (u: AppUser, value: string) => {
    const prev = u.contact_status;
    u.contact_status = value as AppUser["contact_status"];
    try {
        await adminFetch("/api/admin/users/status", { method: "POST", body: { email: u.email, status: value } });
    } catch {
        u.contact_status = prev;
        showToast("Erro ao salvar status.", "error");
    }
};

const updateTag = async (u: AppUser, value: string) => {
    const a = u.tag_override, b = u.risk_tag;
    u.tag_override = value as AppUser["tag_override"];
    u.risk_tag = effectiveTag(value, u.auto_risk_tag);
    try {
        await adminFetch("/api/admin/users/tag", { method: "POST", body: { email: u.email, tag: value } });
        fetchStats();
    } catch {
        u.tag_override = a; u.risk_tag = b;
        showToast("Erro ao salvar tag.", "error");
    }
};

const askBlock = (u: AppUser) => { blockTarget.value = u; };
const confirmBlock = async () => {
    const u = blockTarget.value;
    if (!u) return;
    busyEmail.value = u.email;
    try {
        await adminFetch("/api/admin/users/block", { method: "POST", body: { email: u.email, blocked: !u.blocked } });
        u.blocked = !u.blocked;
        showToast(u.blocked ? "Usuário bloqueado." : "Usuário desbloqueado.");
        blockTarget.value = null;
    } catch {
        showToast("Erro ao atualizar bloqueio.", "error");
    } finally {
        busyEmail.value = null;
    }
};

const registerFtd = async () => {
    if (!ftd.email || !ftd.amount) {
        showToast("Preencha e-mail e valor.", "error");
        return;
    }
    savingFtd.value = true;
    try {
        await adminFetch("/api/admin/ftd", { method: "POST", body: { email: ftd.email.trim().toLowerCase(), amount: ftd.amount } });
        showToast("FTD registrado.");
        ftd.email = ""; ftd.amount = null;
        await Promise.all([fetchStats(), fetchDeposits(), fetchUsers()]);
    } catch {
        showToast("Erro ao registrar FTD.", "error");
    } finally {
        savingFtd.value = false;
    }
};

const exportCsv = async () => {
    exporting.value = true;
    try {
        const blob = await adminFetch<Blob>("/api/admin/users/export", {
            params: {
                search: search.value.trim(), risk: riskFilter.value, subscription: subFilter.value,
                status: statusFilter.value, brand: brandFilter.value,
            },
            responseType: "blob",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "usuarios-rainha.csv";
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        showToast("Erro ao exportar.", "error");
    } finally {
        exporting.value = false;
    }
};

// --- Atalhos ---
const onKey = (e: KeyboardEvent) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInput.value?.focus();
    } else if (e.key === "Escape") {
        blockTarget.value = null;
    }
};

onMounted(() => {
    // Só busca dados se já estiver autenticado; senão o portão de login dispara
    // refreshAll via @authed, evitando 401 e o erro de "carregar atividade".
    if (!needsLogin.value) refreshAll();
    window.addEventListener("keydown", onKey);
});
onUnmounted(() => window.removeEventListener("keydown", onKey));

useHead({ title: "Painel Admin - Rainha da Bet" });
</script>

<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.adm-page {
    min-height: 100vh;
    background: var(--adm-bg);
    color: var(--adm-text);
    position: relative;
    font-family: "Manrope", sans-serif;
}
.adm-wrap {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 28px 80px;
    display: flex;
    flex-direction: column;
    gap: 22px;
}
.adm-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin: -24px -28px 4px;
    padding: 18px 28px;
    background: rgba(7, 9, 15, 0.72);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--adm-border-soft);
}
.adm-logo { display: flex; align-items: center; gap: 11px; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
.adm-logo span {
    background: linear-gradient(92deg, #fff 30%, #ffc2de 75%, var(--adm-accent));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.adm-logo-icon {
    font-size: 22px; color: #fff;
    background: var(--adm-grad-accent);
    border-radius: 10px; padding: 7px;
    box-shadow: 0 6px 18px rgba(251, 101, 166, 0.35);
}
.adm-topbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.adm-email { font-size: 13px; color: var(--adm-muted); }
.adm-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--adm-panel); border: 1px solid var(--adm-border);
    color: var(--adm-muted); border-radius: 9px; padding: 8px 13px;
    font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;
    transition: all 0.2s var(--adm-ease);
}
.adm-btn-ghost:hover:not(:disabled) { border-color: var(--adm-accent); color: var(--adm-accent); }
.adm-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.adm-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
}
.adm-card {
    --c: var(--adm-accent);
    background:
        radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--c) 9%, transparent), transparent 60%),
        var(--adm-panel);
    border: 1px solid var(--adm-border-soft);
    border-radius: 16px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    overflow: hidden;
    text-align: left;
    transition: transform 0.25s var(--adm-ease), border-color 0.25s var(--adm-ease), box-shadow 0.25s var(--adm-ease);
}
.adm-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: var(--c);
    opacity: 0.65;
    transform: scaleX(0.4);
    transform-origin: left;
    transition: transform 0.3s var(--adm-ease), opacity 0.3s var(--adm-ease);
}
.adm-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--c) 45%, var(--adm-border));
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
}
.adm-card:hover::before { transform: scaleX(1); opacity: 1; }
/* paleta por cartão */
.adm-cards > .adm-card:nth-child(1) { --c: var(--adm-accent); }
.adm-cards > .adm-card:nth-child(2) { --c: var(--adm-accent-2); }
.adm-cards > .adm-card:nth-child(3) { --c: var(--adm-gold); }
.adm-cards > .adm-card:nth-child(4) { --c: var(--adm-green); }
.adm-cards > .adm-card:nth-child(5) { --c: #a78bfa; }
.adm-cards > .adm-card:nth-child(6) { --c: var(--adm-accent-2); }
.adm-cards > .adm-card:nth-child(7) { --c: var(--adm-gold); }
.adm-card-ic {
    font-size: 19px;
    color: var(--c);
    width: 38px; height: 38px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--c) 14%, transparent);
    border-radius: 11px;
    margin-bottom: 8px;
}
.adm-card-val { font-size: 27px; font-weight: 800; letter-spacing: -0.6px; color: #ffffff; }
.adm-card-lbl { font-size: 12.5px; color: var(--adm-muted); font-weight: 600; }
.adm-card-risk { --c: var(--adm-red); cursor: pointer; font: inherit; }
.adm-card-risk.on { border-color: var(--adm-red); box-shadow: 0 0 0 1px var(--adm-red), 0 14px 34px rgba(255, 93, 108, 0.18); }
.adm-card-risk.on::before { transform: scaleX(1); opacity: 1; }

.adm-section { position: relative; z-index: 1; }
.adm-panel {
    background: var(--adm-panel);
    border: 1px solid var(--adm-border-soft);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.02) inset;
}
.adm-panel-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
}
.adm-panel-head h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
.adm-panel-head h2 :deep(svg) { color: var(--adm-accent); }

.adm-filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; align-items: center; }
.adm-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft);
    border-radius: 10px; padding: 9px 12px; flex: 1; min-width: 220px;
}
.adm-search :deep(svg) { color: var(--adm-faint); }
.adm-search input { background: none; border: none; outline: none; color: var(--adm-text); font-size: 14px; width: 100%; }
.adm-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.adm-chip {
    background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft);
    color: var(--adm-muted); border-radius: 20px; padding: 7px 13px;
    font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.2s var(--adm-ease);
}
.adm-chip.on { background: var(--adm-accent); border-color: var(--adm-accent); color: #1a0410; }
.adm-select, .adm-input {
    background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft);
    color: var(--adm-text); border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none;
}
.adm-select:focus, .adm-input:focus { border-color: var(--adm-accent); }

.adm-table-wrap { overflow: auto; border-radius: 12px; max-height: 72vh; }
.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 980px; }
.adm-table th {
    position: sticky; top: 0; z-index: 2;
    text-align: left; padding: 12px; color: var(--adm-faint);
    font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;
    background: var(--adm-panel-2);
    border-bottom: 1px solid var(--adm-border); white-space: nowrap;
}
.adm-table td { padding: 11px 12px; border-bottom: 1px solid var(--adm-border-soft); vertical-align: middle; }
.adm-table tbody tr { transition: background 0.15s ease; }
.adm-table tbody tr:hover { background: rgba(251, 101, 166, 0.045); }
.adm-table tbody tr:last-child td { border-bottom: none; }
.adm-td-empty { text-align: center; color: var(--adm-muted); padding: 24px; }
.adm-user { display: flex; align-items: center; gap: 10px; }
.adm-avatar {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; color: #fff;
}
.adm-user-info { display: flex; flex-direction: column; }
.adm-user-info strong { font-size: 13.5px; }
.adm-user-info span { font-size: 12px; color: var(--adm-muted); }
.adm-wa { color: var(--adm-green); text-decoration: none; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.adm-wa:hover { text-decoration: underline; }
.adm-phone-cell { display: flex; align-items: center; gap: 6px; }
.adm-phone-edit-btn { background: transparent; border: none; color: var(--adm-faint); cursor: pointer; padding: 2px; opacity: 0.55; transition: opacity 0.2s, color 0.2s; display: inline-flex; }
.adm-phone-cell:hover .adm-phone-edit-btn { opacity: 1; }
.adm-phone-edit-btn:hover { color: var(--adm-accent); }
.adm-phone-edit { display: flex; align-items: center; gap: 5px; }
.adm-phone-edit input { background: var(--adm-bg-2); border: 1px solid var(--adm-accent); border-radius: 7px; color: var(--adm-text); padding: 5px 8px; font-size: 12px; outline: none; width: 150px; }
.adm-icon-btn.ok:hover:not(:disabled) { border-color: var(--adm-green); color: var(--adm-green); }
.adm-faint { color: var(--adm-faint); }
.adm-date { color: var(--adm-muted); white-space: nowrap; }

.adm-tag-select, .adm-status-select {
    background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft);
    color: var(--adm-text); border-radius: 7px; padding: 5px 8px; font-size: 12px; cursor: pointer; outline: none;
}
.adm-tag-select.tag-24 { border-color: var(--adm-amber); color: var(--adm-amber); }
.adm-tag-select.tag-48 { border-color: var(--adm-red); color: var(--adm-red); }
.adm-tag-select.tag-na { border-color: var(--adm-accent); color: var(--adm-accent); }
.st-convertido { border-color: var(--adm-green); color: var(--adm-green); }
.st-respondeu { border-color: var(--adm-accent-2); color: var(--adm-accent-2); }
.st-ignorado { color: var(--adm-faint); }

.adm-pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
.pill-paid { background: rgba(45, 212, 167, 0.15); color: var(--adm-green); }
.pill-free { background: rgba(138, 147, 171, 0.12); color: var(--adm-muted); }
.pill-active { background: rgba(56, 224, 255, 0.12); color: var(--adm-accent-2); }
.pill-blocked { background: rgba(255, 93, 108, 0.15); color: var(--adm-red); }

.adm-icon-btn {
    background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft);
    color: var(--adm-muted); border-radius: 8px; width: 32px; height: 32px;
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
}
.adm-icon-btn:hover:not(:disabled) { border-color: var(--adm-red); color: var(--adm-red); }
.adm-icon-btn:disabled { opacity: 0.5; }

.adm-more { text-align: center; margin-top: 14px; }
.adm-ftd { display: flex; gap: 10px; flex-wrap: wrap; }
.adm-ftd .adm-input { flex: 1; min-width: 180px; }
.adm-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--adm-accent); color: #1a0410; border: none;
    border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 700; cursor: pointer;
}
.adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.adm-modal-overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;
}
.adm-modal {
    background: var(--adm-panel); border: 1px solid var(--adm-border);
    border-radius: 16px; padding: 28px; max-width: 380px; width: 100%; text-align: center;
    color: var(--adm-text); font-family: "Manrope", sans-serif;
}
.adm-modal-ic { font-size: 36px; color: var(--adm-red); }
.adm-modal h3 { margin: 12px 0 4px; color: var(--adm-text); font-weight: 800; }
.adm-modal p { color: var(--adm-text); font-size: 14px; font-weight: 600; word-break: break-all; }
.adm-modal-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }

.adm-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    padding: 12px 20px; border-radius: 10px; font-size: 14px; z-index: 10000;
}
.adm-toast.ok { background: rgba(45, 212, 167, 0.15); border: 1px solid var(--adm-green); color: var(--adm-green); }
.adm-toast.error { background: rgba(255, 93, 108, 0.15); border: 1px solid var(--adm-red); color: var(--adm-red); }

@media (max-width: 1100px) { .adm-cards { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) {
    .adm-cards { grid-template-columns: 1fr; }
    .adm-wrap { padding: 16px; }
    .adm-topbar { margin: -16px -16px 4px; padding: 14px 16px; }
}
</style>
