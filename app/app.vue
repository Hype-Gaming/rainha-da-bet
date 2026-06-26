<template>
    <div id="app">
        <PageLoader />
        <NuxtPage />
        <UpdateNotification />
        <KycModal :show="showKycModal" @logout="handleKycLogout" />
        <BlockedOverlay v-if="isBlocked" />
    </div>
</template>

<script setup lang="ts">
const { needsKyc, kycChecked, isAuthenticated, logout, fetchUserProfile } =
    useAuth();
const { send: sendHeartbeat } = useHeartbeat();
const { isBlocked } = useAccountBlocked();
const route = useRoute();

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
    if (isAuthenticated.value) {
        await fetchUserProfile();
        sendHeartbeat();
    }
});

// Observar mudanças na rota para verificar KYC
watch(
    () => route.path,
    async () => {
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
</style>
