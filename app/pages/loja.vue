<template>
  <main class="loja">
    <NuxtLink to="/" class="back"><Icon name="ph:arrow-left-bold" /> Voltar</NuxtLink>
    <section>
      <div class="icon"><Icon name="ph:storefront-bold" /></div>
      <span class="eyebrow">EM BREVE</span>
      <h1>Novidades chegando</h1>
      <p>Estamos preparando a loja com benefícios exclusivos para a comunidade.</p>
    </section>
  </main>
</template>
<script setup lang="ts">
useHead({ title: 'Loja' })
</script>
<style scoped>
.loja { min-height: 100vh; display: grid; place-items: center; padding: 76px 18px 40px; overflow-x: clip; text-align: center; color: #f8f6fa; background: radial-gradient(circle at 50% 10%, #ff149330, transparent 40%), #090909; font-family: Manrope, sans-serif; }
.back { position: absolute; top: 20px; left: 16px; min-height: 44px; padding: 0 12px; display: flex; gap: 8px; align-items: center; color: #d0cbd1; text-decoration: none; border-radius: 12px; }
.back:focus-visible { outline: 2px solid #ff1493; }
.icon { width: 72px; height: 72px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 22px; color: #ff1493; font-size: 36px; background: #ff149322; }
.eyebrow { color: #ff8ec8; font-size: 11px; font-weight: 900; letter-spacing: .14em; }
h1 { margin: 8px 0; font-size: clamp(30px, 7vw, 44px); }
p { color: #b7b3bc; max-width: 360px; margin: 0 auto; line-height: 1.6; }
</style>
