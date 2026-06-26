<template>
    <Transition name="fade">
        <div v-if="isLoading" class="page-loader">
            <div class="loader-content">
                <div class="loader-logo">
                    <img src="/logo.png" alt="Rainha da Bet" />
                </div>
                <div class="loader-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <p class="loader-text">Carregando...</p>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
const nuxtApp = useNuxtApp();
const isLoading = ref(false);

nuxtApp.hook("page:start", () => {
    isLoading.value = true;
});

nuxtApp.hook("page:finish", () => {
    setTimeout(() => {
        isLoading.value = false;
    }, 300);
});
</script>

<style scoped>
.page-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
}

.loader-logo {
    animation: pulse-logo 2s ease-in-out infinite;
}

.loader-logo img {
    height: 60px;
    width: auto;
}

@keyframes pulse-logo {
    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(0.95);
    }
}

.loader-spinner {
    position: relative;
    width: 60px;
    height: 60px;
}

.spinner-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid transparent;
    animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(1) {
    border-top-color: #fb65a6;
    animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
    border-right-color: #fb65a6;
    animation-delay: 0.15s;
    width: 80%;
    height: 80%;
    top: 10%;
    left: 10%;
}

.spinner-ring:nth-child(3) {
    border-bottom-color: #fb65a6;
    animation-delay: 0.3s;
    width: 60%;
    height: 60%;
    top: 20%;
    left: 20%;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.loader-text {
    color: #888888;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
    animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
