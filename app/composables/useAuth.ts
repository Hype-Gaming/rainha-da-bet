// Composable de Autenticação - Rainha da Bet
//
// A sessão vive num cookie httpOnly assinado pelo servidor: o token do provedor
// viaja dentro dele, mas o JS da página não consegue lê-lo (ao contrário do
// localStorage, que qualquer XSS lê). A api-key do velvet é credencial da casa
// e não sai do servidor. Toda chamada autenticada passa por /api/routes/*.

import { DEFAULT_BRAND, getBrand } from '../../shared/brands'

export interface Wallet {
  credit: number
  balance: number
  bonus: number
  locked: number
  currency: string
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  wallet?: Wallet
  kyc_validated_at?: string | null
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  balance: number
  needsKyc: boolean
  kycChecked: boolean
  brandSlug: string
  baseDomain: string
  userCollection: string
}

const authState = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
  balance: 0,
  needsKyc: false,
  kycChecked: false,
  brandSlug: DEFAULT_BRAND.slug,
  baseDomain: DEFAULT_BRAND.baseDomain,
  userCollection: DEFAULT_BRAND.userCollection
})

let sessionPromise: Promise<void> | null = null

export const useAuth = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const applyBrand = (slug?: string | null) => {
    const brand = getBrand(slug)
    authState.brandSlug = brand.slug
    authState.baseDomain = brand.baseDomain
    authState.userCollection = brand.userCollection
  }

  const clearAuth = () => {
    authState.user = null
    authState.isAuthenticated = false
    authState.balance = 0
    authState.needsKyc = false
    authState.kycChecked = false
    applyBrand(DEFAULT_BRAND.slug)
  }

  const requireKyc = () => {
    authState.needsKyc = true
    authState.kycChecked = true
  }

  /**
   * Lê a sessão do cookie. Substitui o antigo loadAuthState() do localStorage —
   * quem decide se há sessão é o servidor, não o cliente.
   */
  const refreshSession = async (): Promise<void> => {
    if (sessionPromise) return sessionPromise
    sessionPromise = (async () => {
      try {
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
        const res = await $fetch<{
          authenticated: boolean
          user: User | null
          brandSlug: string | null
        }>('/api/session', { headers, credentials: 'include' })

        authState.isAuthenticated = !!res.authenticated
        authState.user = res.user
        applyBrand(res.brandSlug)
      } catch {
        clearAuth()
      }
    })()
    try {
      await sessionPromise
    } finally {
      sessionPromise = null
    }
  }

  // Perfil + saldo pela nossa rota (o servidor fala com o velvet).
  const fetchUserProfile = async (): Promise<void> => {
    if (!authState.isAuthenticated) return

    try {
      const response = await $fetch<User & { wallet: Wallet; kyc_known?: boolean }>(
        '/api/routes/user',
        { credentials: 'include' }
      )

      authState.user = { ...authState.user, ...response } as User
      authState.balance = (response.wallet?.credit || 0) / 100

      // Só bloqueia por KYC se o upstream realmente informar o campo. O velvet
      // não expõe KYC hoje: sem isto, needsKyc ficaria true para todo mundo.
      authState.needsKyc = response.kyc_known === true && !response.kyc_validated_at
      authState.kycChecked = true
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        clearAuth()
        await navigateTo('/auth/login?reason=session_expired')
        return
      }
      console.error('Erro ao buscar perfil do usuário:', err)
    }
  }

  // Login com email ou CPF
  const login = async (credentials: {
    email?: string
    cpf?: string
    password: string
  }): Promise<{ success: boolean; message?: string }> => {
    loading.value = true
    error.value = null

    // A API usa o campo "email" como login único: aceita e-mail OU CPF.
    const identifier = credentials.email
      || credentials.cpf?.replace(/\D/g, '')
      || ''

    try {
      const res = await $fetch<{ user: User; brandSlug: string }>('/api/session/login', {
        method: 'POST',
        credentials: 'include',
        body: {
          email: identifier,
          password: credentials.password,
          brand_slug: DEFAULT_BRAND.slug,
          base_domain: DEFAULT_BRAND.baseDomain
        }
      })

      authState.user = res.user
      authState.isAuthenticated = true
      applyBrand(res.brandSlug)

      await fetchUserProfile()
      return { success: true }
    } catch (err: any) {
      const status = err?.statusCode || err?.response?.status
      let message = 'Erro ao fazer login. Tente novamente.'
      if (err?.data?.invalidCredentials || status === 401) {
        message = 'E-mail/CPF ou senha incorretos.'
      } else if (status === 429) {
        message = 'Muitas tentativas. Aguarde um momento.'
      } else if (status === 502 || status >= 500) {
        message = 'O serviço de autenticação está indisponível. Aguarde dois minutos e tente novamente.'
      }
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await $fetch('/api/session', { method: 'DELETE', credentials: 'include' })
    } catch (err) {
      console.error('Erro no logout:', err)
    } finally {
      clearAuth()
      loading.value = false
      navigateTo('/auth/login')
    }
  }

  const formattedBalance = computed(() =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(authState.balance)
  )

  return {
    user: computed(() => authState.user),
    isAuthenticated: computed(() => authState.isAuthenticated),
    balance: computed(() => authState.balance),
    needsKyc: computed(() => authState.needsKyc),
    kycChecked: computed(() => authState.kycChecked),
    brandSlug: computed(() => authState.brandSlug),
    baseDomain: computed(() => authState.baseDomain),
    brandName: computed(() => getBrand(authState.brandSlug).name),
    affiliateUrl: computed(() => getBrand(authState.brandSlug).affiliateUrl),
    formattedBalance,
    loading: readonly(loading),
    error: readonly(error),

    login,
    logout,
    refreshSession,
    clearAuth,
    requireKyc,
    fetchUserProfile
  }
}
