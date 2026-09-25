<template>
  <Teleport to="body">
    <div v-if="state.open" class="intro-overlay" @click.self="close" @keydown.esc="close">
      <section ref="dialog" class="intro-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title" tabindex="-1">
        <button class="intro-close" type="button" aria-label="Fechar vídeo" @click="close"><Icon name="ph:x-bold" /></button>
        <span class="intro-eyebrow">BEM-VINDA</span>
        <h2 id="intro-title">Assista para liberar seu primeiro jogo grátis</h2>
        <video ref="video" :src="state.videoSrc" controls playsinline preload="metadata" @timeupdate="onTime" @seeking="onSeeking" @error="fail" />
        <div class="intro-bar" role="progressbar" aria-label="Progresso do vídeo" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="percent"><i :style="{ width: percent + '%' }" /></div>
        <p v-if="!done">Assista pelo menos 90% para liberar seu primeiro jogo grátis.</p>
        <p v-else class="intro-done">Liberado!</p>
        <button v-if="done" class="intro-cta" type="button" @click="close"><Icon name="ph:play-fill" /> Jogar agora</button>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
const { state, close, complete, fail } = useIntroVideo()
const video = ref<HTMLVideoElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const maxWatched = ref(0)
const percent = ref(0)
const done = ref(false)

watch(() => state.open, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) { maxWatched.value = 0; percent.value = 0; done.value = false; await nextTick(); dialog.value?.focus() }
})
const onTime = () => {
  const v = video.value
  if (!v || !v.duration) return
  maxWatched.value = Math.max(maxWatched.value, v.currentTime)
  percent.value = Math.round(maxWatched.value / v.duration * 100)
  if (!done.value && maxWatched.value / v.duration >= 0.9) { done.value = true; complete() }
}
// Não deixa avançar além do que já foi assistido; voltar e pausar são livres.
const onSeeking = () => {
  const v = video.value
  if (v && v.currentTime > maxWatched.value + 0.5) v.currentTime = maxWatched.value
}
onUnmounted(() => { document.body.style.overflow = '' })
</script>
<style scoped>
.intro-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, .78); backdrop-filter: blur(7px); overflow-y: auto; }
.intro-modal { position: relative; width: min(560px, 100%); padding: 30px 22px 22px; text-align: center; color: #fff; border: 1px solid color-mix(in srgb, var(--accent, #ff1493) 42%, transparent); border-radius: 26px; background: radial-gradient(circle at 50% 0, color-mix(in srgb, var(--accent, #ff1493) 26%, #171217), #171217 67%); box-shadow: 0 24px 80px #000; }
.intro-modal:focus { outline: none; }
.intro-eyebrow { color: #ff8ec8; font-size: 11px; font-weight: 900; letter-spacing: .14em; }
.intro-modal h2 { margin: 8px 0 16px; font-size: 22px; line-height: 1.15; }
video { display: block; width: 100%; max-height: 52vh; border-radius: 14px; background: #000; }
.intro-bar { height: 8px; margin: 14px 0 10px; border-radius: 9px; background: #ffffff18; overflow: hidden; }
.intro-bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent, #ff1493), #ff8ec8); transition: width .2s; }
p { margin: 0; color: #d0b4c5; font-size: 13px; }
.intro-done { color: #86efac; font-weight: 800; }
.intro-cta { width: 100%; min-height: 48px; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 12px; background: var(--accent, #ff1493); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
.intro-close { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; border: 0; border-radius: 50%; color: #ddd; background: #ffffff12; cursor: pointer; }
.intro-close:focus-visible, .intro-cta:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .intro-bar i { transition: none; } }
</style>
