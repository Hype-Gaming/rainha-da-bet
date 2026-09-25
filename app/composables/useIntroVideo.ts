// Vídeo de boas-vindas: libera o 1º jogo grátis depois de 90% assistido. Qualquer falha libera o jogo.
const state = reactive({ videoSrc: '', watched: false, paid: false, failed: false, loaded: false, open: false })
let loadedFor = ''
let autoOpened = false

export const useIntroVideo = () => {
  const { user } = useAuth()
  const { homeConfig, loadHomeConfig } = useHomeConfig()

  const load = async () => {
    const email = user.value?.email?.toLowerCase()
    if (!email) return
    if (loadedFor === email && state.loaded) return
    try {
      await loadHomeConfig()
      state.videoSrc = homeConfig.value.heroVideo.trim()
      const [intro, sub] = await Promise.all([
        $fetch<{ watched: boolean }>('/api/track/intro-video', { params: { email } }),
        $fetch<{ active: boolean }>('/api/subscription/check', { params: { email } })
      ])
      state.watched = intro.watched
      state.paid = sub.active
      state.failed = false
    } catch {
      state.failed = true
    }
    state.loaded = true
    loadedFor = email
  }

  const required = computed(() => !!state.videoSrc && !state.watched && !state.paid && !state.failed)
  const show = () => { state.open = true }
  const close = () => { state.open = false }
  const fail = () => { state.failed = true; state.open = false }
  const complete = async () => {
    state.watched = true
    const email = user.value?.email
    if (email) await $fetch('/api/track/intro-video', { method: 'POST', body: { email } }).catch(() => {})
  }
  const autoOpen = async () => {
    await load()
    if (required.value && !autoOpened) { autoOpened = true; state.open = true }
  }

  return { state, required, load, show, close, complete, fail, autoOpen }
}
