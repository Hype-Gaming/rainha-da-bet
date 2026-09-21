<template>
    <div id="app">
        <MaintenanceOverlay
            v-if="showMaintenance"
            :title="maintenance.title"
            :message="maintenance.message"
            :checking="checkingMaintenance"
            @retry="checkMaintenance"
        />
        <div v-else-if="!maintenanceReady && !isAdminRoute" class="maintenance-check" aria-label="Verificando disponibilidade"></div>
        <template v-else>
            <PageLoader />
            <NuxtPage />
            <UpdateNotification />
            <KycModal :show="showKycModal" @logout="handleKycLogout" />
            <BlockedOverlay v-if="isBlocked" />
        </template>
    </div>
</template>

<script setup lang="ts">
const { needsKyc, kycChecked, isAuthenticated, logout, fetchUserProfile } =
    useAuth();
const { send: sendHeartbeat } = useHeartbeat();
const { isBlocked } = useAccountBlocked();
const route = useRoute();
const { maintenance, maintenanceReady, refreshMaintenance } = useMaintenance();
const checkingMaintenance = ref(false);
let maintenanceTimer: ReturnType<typeof setInterval> | null = null;

const isAdminRoute = computed(() => route.path.startsWith("/admin"));
const showMaintenance = computed(
    () => maintenance.enabled && !isAdminRoute.value,
);

const checkMaintenance = async () => {
    checkingMaintenance.value = true;
    await refreshMaintenance();
    checkingMaintenance.value = false;
};

// Mostrar modal de KYC quando necessário (apenas em rotas autenticadas e após verificação)
const showKycModal = computed(() => {
    const isAuthRoute = route.path.startsWith("/auth");
    // Só mostra se: está autenticado, KYC já foi verificado, precisa de KYC, e não está em rota de auth
    return (
        isAuthenticated.value &&
        kycChecked.value &&
        needsKyc.value &&
        !isAuthRoute &&
        !isBlocked.value
    );
});

// Verificar KYC ao carregar a página
onMounted(async () => {
    await checkMaintenance();
    maintenanceTimer = setInterval(refreshMaintenance, 30_000);
    if (isAuthenticated.value) {
        await fetchUserProfile();
        sendHeartbeat();
    }
});

onUnmounted(() => {
    if (maintenanceTimer) clearInterval(maintenanceTimer);
});

// Observar mudanças na rota para verificar KYC
watch(
    () => route.path,
    async () => {
        await refreshMaintenance();
        if (isAuthenticated.value && !route.path.startsWith("/auth")) {
            await fetchUserProfile();
            sendHeartbeat();
        }
    },
);

const handleKycLogout = async () => {
    await logout();
};

// Componente raiz da aplicação Nuxt
useHead({
    title: "Rainha da Bet",
    meta: [
        {
            name: "description",
            content: "Rainha da Bet - Sala de sinais e comunidade exclusiva",
        },
    ],
});
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html,
body {
    background: #0a0a0a;
}

body {
    font-family: "Manrope", "Space Grotesk", sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

#app {
    min-height: 100vh;
    background: transparent;
}

.maintenance-check {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #0a0a0a;
}
</style>
