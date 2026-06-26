import type { Ref } from 'vue'

// Anima um número de 0 (ou do valor atual) até o alvo via requestAnimationFrame.
// Respeita prefers-reduced-motion.
export const useCountUp = (target: Ref<number> | (() => number), duration = 900) => {
  const display = ref(0)
  let raf: number | null = null

  const getTarget = () => (typeof target === 'function' ? target() : target.value) || 0

  const animate = () => {
    const to = getTarget()
    if (!import.meta.client) {
      display.value = to
      return
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      display.value = to
      return
    }
    const from = display.value
    const start = performance.now()
    if (raf) cancelAnimationFrame(raf)
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      display.value = from + (to - from) * eased
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  watch(getTarget, animate, { immediate: true })
  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  return display
}
