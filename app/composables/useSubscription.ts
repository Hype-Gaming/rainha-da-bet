const SUBSCRIPTION_SESSION_KEY = 'irmandade_subscription'
const MODAL_DISMISSED_KEY = 'irmandade_modal_dismissed'
const CACHE_TTL_MS = 5 * 60 * 1000

// Duas operações distintas, propositalmente com nomes distintos:
//
//   refresh()            -> "qual é o MEU estado?"   (servidor lê o e-mail da sessão)
//   linkSubscription(e)  -> "esta compra é minha"    (vincula o e-mail da Lastlink)
//
// Antes as duas eram a mesma função recebendo um e-mail arbitrário — e era
// exatamente essa confusão que permitia consultar a assinatura de qualquer pessoa.

interface SubscriptionCache {
  active: boolean
  role: 'paid' | 'free'
  email: string | null
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

const saveCache = (email: string | null, active: boolean, role: 'paid' | 'free', blocked: boolean) => {
  if (!import.meta.client) return
  sessionStorage.setItem(
    SUBSCRIPTION_SESSION_KEY,
    JSON.stringify({ active, role, email, blocked, ts: Date.now() })
  )
}

export const clearSubscriptionCache = () => {
  if (!import.meta.client) return
  sessionStorage.removeItem(SUBSCRIPTION_SESSION_KEY)
  sessionStorage.removeItem(MODAL_DISMISSED_KEY)
}

interface SubscriptionResponse {
  active: boolean
  role: 'paid' | 'free'
  blocked?: boolean
  status?: string | null
}

export const useSubscription = () => {
  const checking = ref(false)
  const error = ref('')
  const { apiFetch } = useApi()

  /** Consulta o estado do usuário logado (sem parâmetros: o servidor sabe quem é). */
  const refresh = async (): Promise<boolean> => {
    checking.value = true
    error.value = ''
    try {
      const result = await apiFetch<SubscriptionResponse>('/api/subscription/check')
      const blocked = !!result.blocked
      const role = result.role ?? (result.active ? 'paid' : 'free')
      const email = subscriptionState.email
      saveCache(email, result.active, role, blocked)
      applySubscriptionState(email, result.active, role, blocked)
      return result.active
    } catch (err: any) {
      const status = err?.status || err?.statusCode
      // 401 = sem sessão no servidor. Não é falha de assinatura: trata como
      // "não assinante" e deixa o modal aparecer, sem mensagem de erro assustando.
      if (status === 401) {
        applySubscriptionState(null, false, 'free', false)
        return false
      }
      error.value = 'Erro ao verificar. Tente novamente.'
      return false
    } finally {
      checking.value = false
    }
  }

  const init = async (options: { force?: boolean } = {}) => {
    if (!import.meta.client) return false

    const cache = loadCache()
    if (!options.force && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      applySubscriptionState(
        cache.email,
        cache.active,
        cache.role ?? (cache.active ? 'paid' : 'free'),
        !!cache.blocked
      )
      return cache.active
    }

    return await refresh()
  }

  /** Comprova a compra: vincula o e-mail da Lastlink à conta logada. */
  const linkSubscription = async (email: string): Promise<boolean> => {
    checking.value = true
    error.value = ''
    try {
      const result = await apiFetch<SubscriptionResponse>('/api/subscription/link', {
        method: 'POST',
        body: { email }
      })

      if (!result.active) return false

      const role = result.role ?? 'paid'
      const blocked = !!result.blocked
      saveCache(email, true, role, blocked)
      applySubscriptionState(email, true, role, blocked)
      return true
    } catch (err: any) {
      const status = err?.status || err?.statusCode
      error.value =
        status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos.'
          : 'Erro ao verificar. Tente novamente.'
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
    refresh,
    linkSubscription,
    dismissModal,
    openModal
  }
}
