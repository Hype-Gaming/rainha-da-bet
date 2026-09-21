<template>
    <main class="maintenance" role="status" aria-live="polite">
        <div class="maintenance__glow maintenance__glow--one"></div>
        <div class="maintenance__glow maintenance__glow--two"></div>

        <section class="maintenance__card">
            <img src="/logo.png" alt="Rainha da Bet" class="maintenance__logo" />
            <div class="maintenance__icon">
                <Icon name="ph:wrench-bold" />
            </div>
            <p class="maintenance__eyebrow">Pausa rápida</p>
            <h1>{{ title }}</h1>
            <p class="maintenance__message">{{ message }}</p>
            <div class="maintenance__status">
                <span></span>
                Nossa equipe já está trabalhando nisso
            </div>
            <button class="maintenance__retry" :disabled="checking" @click="$emit('retry')">
                <Icon name="ph:arrow-clockwise-bold" :class="{ spin: checking }" />
                {{ checking ? "Verificando..." : "Verificar novamente" }}
            </button>
        </section>
    </main>
</template>

<script setup lang="ts">
defineProps<{ title: string; message: string; checking?: boolean }>();
defineEmits<{ retry: [] }>();
</script>

<style scoped>
.maintenance { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; overflow: hidden; padding: 24px; color: #fff; background: radial-gradient(circle at 50% -10%, #43142f 0, #170912 38%, #08070a 75%); font-family: "Manrope", sans-serif; }
.maintenance__glow { position: absolute; width: 380px; height: 380px; border-radius: 50%; filter: blur(100px); opacity: .25; pointer-events: none; }
.maintenance__glow--one { background: #ff4fa0; top: -180px; right: -80px; }
.maintenance__glow--two { background: #8f38ff; bottom: -220px; left: -120px; }
.maintenance__card { position: relative; width: min(100%, 560px); padding: 44px 36px; text-align: center; border: 1px solid rgba(255,255,255,.1); border-radius: 28px; background: rgba(18,13,18,.78); box-shadow: 0 30px 90px rgba(0,0,0,.48); backdrop-filter: blur(18px); }
.maintenance__logo { width: 86px; height: 86px; object-fit: contain; margin-bottom: 22px; filter: drop-shadow(0 8px 22px rgba(255,79,160,.25)); }
.maintenance__icon { display: grid; place-items: center; width: 52px; height: 52px; margin: 0 auto 16px; border-radius: 16px; color: #ff76b5; font-size: 27px; background: rgba(255,79,160,.11); border: 1px solid rgba(255,118,181,.2); }
.maintenance__eyebrow { margin: 0 0 9px; color: #ff76b5; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(30px, 7vw, 46px); line-height: 1.08; letter-spacing: -.04em; }
.maintenance__message { max-width: 440px; margin: 18px auto 24px; color: #c9bec7; font-size: 16px; line-height: 1.65; white-space: pre-line; }
.maintenance__status { display: flex; align-items: center; justify-content: center; gap: 9px; color: #948991; font-size: 13px; }
.maintenance__status span { width: 8px; height: 8px; border-radius: 50%; background: #ff76b5; box-shadow: 0 0 0 5px rgba(255,118,181,.1); animation: pulse 1.8s ease-in-out infinite; }
.maintenance__retry { display: inline-flex; align-items: center; gap: 8px; margin-top: 28px; padding: 12px 18px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; color: #f7eef4; background: rgba(255,255,255,.06); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.maintenance__retry:hover:not(:disabled) { border-color: #ff76b5; background: rgba(255,79,160,.1); }
.maintenance__retry:disabled { opacity: .65; cursor: wait; }
.spin { animation: spin .8s linear infinite; }
@keyframes pulse { 50% { opacity: .45; transform: scale(.8); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 520px) { .maintenance__card { padding: 34px 22px; border-radius: 22px; } .maintenance__logo { width: 72px; height: 72px; } }
</style>
