<template>
  <Teleport to="body">
    <div v-if="show" class="game-error-overlay" role="dialog" aria-modal="true" aria-labelledby="game-error-title">
      <div class="game-error-modal">
        <div class="game-error-icon"><Icon name="ph:warning-circle-bold" /></div>
        <h2 id="game-error-title">Não foi possível abrir o jogo</h2>
        <p>A casa de apostas recusou a abertura. Confira se sua conta está ativa, se há saldo e tente novamente.</p>
        <div class="game-error-actions">
          <button type="button" class="retry" @click="$emit('retry')"><Icon name="ph:arrow-clockwise-bold" /> Tentar novamente</button>
          <a :href="supportHref" target="_blank" rel="noopener" class="support"><Icon name="ph:whatsapp-logo-bold" /> Falar com o suporte</a>
        </div>
        <button type="button" class="close" aria-label="Fechar" @click="$emit('close')"><Icon name="ph:x-bold" /></button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ show: boolean }>()
defineEmits<{ retry: []; close: [] }>()
const supportHref = ref('https://wa.me/5571993887915')

onMounted(async () => {
  try {
    const response = await $fetch<{ href: string }>('/api/settings/support')
    if (response?.href) supportHref.value = response.href
  } catch {
    // Mantém o fallback para que o usuário nunca fique sem saída.
  }
})
</script>

<style scoped>
.game-error-overlay { position: fixed; inset: 0; z-index: 100001; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, .82); backdrop-filter: blur(8px); }
.game-error-modal { position: relative; width: min(100%, 440px); padding: 32px; border: 1px solid rgba(251, 101, 166, .4); border-radius: 18px; background: #101018; color: #fff; text-align: center; box-shadow: 0 24px 70px rgba(0, 0, 0, .65); }
.game-error-icon { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 18px; border-radius: 50%; background: rgba(251, 101, 166, .12); color: #fb65a6; font-size: 34px; }
h2 { margin: 0 0 12px; font-size: 22px; }
p { margin: 0 0 24px; color: #aaa; font-size: 14px; line-height: 1.6; }
.game-error-actions { display: grid; gap: 10px; }
.game-error-actions > * { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 18px; border-radius: 10px; font: 700 14px inherit; cursor: pointer; text-decoration: none; }
.retry { border: 0; background: #fb65a6; color: #160912; }
.support { border: 1px solid rgba(37, 211, 102, .5); background: rgba(37, 211, 102, .1); color: #45db7a; }
.close { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; color: #777; cursor: pointer; }
.close:hover { background: rgba(255,255,255,.08); color: #fff; }
</style>
