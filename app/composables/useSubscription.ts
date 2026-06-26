const SUBSCRIPTION_SESSION_KEY = 'irmandade_subscription'
const MODAL_DISMISSED_KEY = 'irmandade_modal_dismissed'
const CACHE_TTL_MS = 5 * 60 * 1000

interface SubscriptionCache {
  active: boolean
  role: 'paid' | 'free'
  email: string
  blocked: boolean
  ts: number
}

const subscriptionState = reactive({
  isSubscribed: false,
  role: 'free' as 'paid' | 'free',
  email: null as string | null,
  showModal: false,
  checked: false
})

const applySubscriptionState = (
  email: string | null,
  active: boolean,
  role: 'paid' | 'free',
  blocked = false
) => {
  subscriptionState.isSubscribed = active
  subscriptionState.role = role
  subscriptionState.email = email
  // Bloqueado: nunca abre o modal de assinatura/verificar e-mail — só o overlay de bloqueio.
  subscriptionState.showModal = !active && !blocked
  subscriptionState.checked = true
  useAccountBlocked().setBlocked(blocked)
}

const loadCache = (): SubscriptionCache | null => {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(SUBSCRIPTION_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveCache = (email: string, active: boolean, role: 'paid' | 'free', blocked: boolean) => {
  if (!import.meta.client) return
  sessionStorage.setItem(SUBSCRIPTION_SESSION_KEY, JSON.stringify({ active, role, email, blocked, ts: Date.now() }))
}

export const clearSubscriptionCache = () => {
  if (!import.meta.client) return
  sessionStorage.removeItem(SUBSCRIPTION_SESSION_KEY)
  sessionStorage.removeItem(MODAL_DISMISSED_KEY)
}

export const useSubscription = () => {
  const checking = ref(false)
  const error = ref('')

  const init = async (email?: string | null, options: { force?: boolean } = {}) => {
    if (!import.meta.client) return

    const cache = loadCache()
    const hasFreshMatchingCache =
      !options.force &&
      cache &&
      Date.now() - cache.ts < CACHE_TTL_MS &&
      (!email || cache.email === email)

    if (hasFreshMatchingCache) {
      applySubscriptionState(cache.email, cache.active, cache.role ?? (cache.active ? 'paid' : 'free'), !!cache.blocked)
      return cache.active
    }

    if (email) {
      return await checkSubscription(email)
    }

    // Sem cache: abre o modal sempre
    subscriptionState.showModal = true
    subscriptionState.checked = true
    return false
  }

  const checkSubscription = async (email: string): Promise<boolean> => {
    checking.value = true
    error.value = ''
    try {
      const result = await $fetch<{ active: boolean; role: 'paid' | 'free'; blocked?: boolean }>('/api/subscription/check', {
        params: { email }
      })
      // Bloqueio do painel admin trava o app inteiro (overlay em app.vue) e suprime o modal.
      const blocked = !!result.blocked
      const role = result.role ?? (result.active ? 'paid' : 'free')
      saveCache(email, result.active, role, blocked)
      applySubscriptionState(email, result.active, role, blocked)
      return result.active
    } catch {
      error.value = 'Erro ao verificar. Tente novamente.'
      return false
    } finally {
      checking.value = false
    }
  }

  const dismissModal = () => {
    subscriptionState.showModal = false
    if (import.meta.client) {
      sessionStorage.setItem(MODAL_DISMISSED_KEY, '1')
    }
  }

  const openModal = () => {
    subscriptionState.showModal = true
  }

  return {
    isSubscribed: computed(() => subscriptionState.isSubscribed),
    isPaid: computed(() => subscriptionState.role === 'paid'),
    role: computed(() => subscriptionState.role),
    showModal: computed(() => subscriptionState.showModal),
    email: computed(() => subscriptionState.email),
    checked: computed(() => subscriptionState.checked),
    checking: readonly(checking),
    error: readonly(error),
    init,
    checkSubscription,
    dismissModal,
    openModal
  }
}
