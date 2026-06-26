// Composable de Autenticação - Irmandade Club
// Integração com API Cactus
//
// Suporta múltiplas marcas (esportiva e bateu): no login o app tenta cada marca
// até uma autenticar. A marca que logou fica guardada na sessão e é usada nas
// chamadas seguintes (perfil, jogo, depósito, validação admin).

import { BRANDS, DEFAULT_BRAND, getBrand } from '../../shared/brands'

// Tipos
export interface Wallet {
  id: number
  balance: number
  credit: number
  available_value: number
  user_id: number
  bonus: number
  withdraw_enabled: number
}

export interface User {
  id: number
  name: string
  email: string
  phone: string
  created_at: string
  is_active: number
  country: string
  currency: string
  first_name?: string
  last_name?: string
  wallet?: Wallet
  kyc_validated_at?: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
  cookie_key: number
  cookies_path: string
  brand_slug: string
  base_domain: string
  need_change_password: boolean
}

export interface UserProfileResponse extends User {
  wallet: Wallet
}

export interface AuthState {
  user: User | null
  token: string | null
  cookieKey: number | null
  isAuthenticated: boolean
  balance: number
  needsKyc: boolean
  kycChecked: boolean
  // Marca (brand) com que o usuário autenticou
  brandSlug: string
  baseDomain: string
  apiBaseUrl: string
  userCollection: string
}

// Estado global reativo
const authState = reactive<AuthState>({
  user: null,
  token: null,
  cookieKey: null,
  isAuthenticated: false,
  balance: 0,
  needsKyc: false,
  kycChecked: false,
  brandSlug: DEFAULT_BRAND.slug,
  baseDomain: DEFAULT_BRAND.baseDomain,
  apiBaseUrl: DEFAULT_BRAND.apiBaseUrl,
  userCollection: DEFAULT_BRAND.userCollection
})

export const useAuth = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Carregar estado do localStorage ao inicializar
  const loadAuthState = () => {
    if (import.meta.client) {
      const savedAuth = localStorage.getItem('irmandade_auth')
      if (savedAuth) {
        try {
          const parsed = JSON.parse(savedAuth)
          authState.user = parsed.user
          authState.token = parsed.token
          authState.cookieKey = parsed.cookieKey
          authState.isAuthenticated = !!parsed.token
          authState.balance = parsed.balance || 0
          // Restaura a marca da sessão (sessões antigas caem no padrão)
          const brand = getBrand(parsed.brandSlug)
          authState.brandSlug = brand.slug
          authState.baseDomain = brand.baseDomain
          authState.apiBaseUrl = brand.apiBaseUrl
          authState.userCollection = brand.userCollection
        } catch (e) {
          console.error('Erro ao carregar estado de autenticação:', e)
          clearAuth()
        }
      }
    }
  }

  // Salvar estado no localStorage
  const saveAuthState = () => {
    if (import.meta.client) {
      localStorage.setItem('irmandade_auth', JSON.stringify({
        user: authState.user,
        token: authState.token,
        cookieKey: authState.cookieKey,
        balance: authState.balance,
        brandSlug: authState.brandSlug
      }))
    }
  }

  // Limpar autenticação
  const clearAuth = () => {
    authState.user = null
    authState.token = null
    authState.cookieKey = null
    authState.isAuthenticated = false
    authState.balance = 0
    authState.needsKyc = false
    authState.kycChecked = false
    authState.brandSlug = DEFAULT_BRAND.slug
    authState.baseDomain = DEFAULT_BRAND.baseDomain
    authState.apiBaseUrl = DEFAULT_BRAND.apiBaseUrl
    authState.userCollection = DEFAULT_BRAND.userCollection
    if (import.meta.client) {
      localStorage.removeItem('irmandade_auth')
    }
  }

  // Buscar perfil do usuário (inclui wallet/balance)
  const fetchUserProfile = async (): Promise<void> => {
    if (!authState.token || !authState.cookieKey) return

    try {
      const response = await $fetch<UserProfileResponse>(`${authState.apiBaseUrl}/api/auth/user`, {
        method: 'GET',
        params: {
          collection: authState.userCollection
        },
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'X-Brand-Slug': authState.brandSlug,
          'X-Base-Domain': authState.baseDomain,
          'X-Cactus-Cookie-Key': authState.cookieKey.toString()
        }
      })

      // Atualizar dados do usuário com informações completas
      authState.user = {
        ...authState.user,
        id: response.id,
        name: response.name,
        email: response.email,
        phone: response.phone,
        first_name: response.first_name,
        last_name: response.last_name,
        wallet: response.wallet,
        kyc_validated_at: (response as any).kyc_validated_at || null
      } as User

      // Atualizar balance usando credit e convertendo (credit / 100)
      if (response.wallet) {
        const credit = response.wallet.credit || 0
        authState.balance = credit / 100
      }

      // Verificar se precisa KYC - o campo está dentro de userInfo ou user_info
      const userInfo = (response as any).userInfo || (response as any).user_info
      const kycValidatedAt = userInfo?.kyc_validated_at
      authState.needsKyc = !kycValidatedAt || kycValidatedAt === '' || kycValidatedAt === null
      authState.kycChecked = true

      console.log('KYC Check:', { kycValidatedAt, needsKyc: authState.needsKyc })

      saveAuthState()
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        clearAuth()
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

    let lastError: any = null

    try {
      // Tenta cada marca (esportiva, bateu) até uma autenticar.
      for (const brand of BRANDS) {
        const body: Record<string, any> = {
          password: credentials.password,
          brand_slug: brand.slug,
          base_domain: brand.baseDomain,
          app_source: 'web',
          save_cookies: true
        }

        // A API Cactus usa o campo "email" como login único: aceita e-mail OU CPF.
        if (credentials.email) {
          body.email = credentials.email
        } else if (credentials.cpf) {
          // CPF entra no mesmo campo "email", só os dígitos.
          body.email = credentials.cpf.replace(/\D/g, '')
        }

        try {
          const response = await $fetch<LoginResponse>(`${brand.apiBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Brand-Slug': brand.slug,
              'X-Base-Domain': brand.baseDomain
            },
            body
          })

          // Sucesso: fixa a marca que autenticou nesta sessão
          authState.brandSlug = brand.slug
          authState.baseDomain = brand.baseDomain
          authState.apiBaseUrl = brand.apiBaseUrl
          authState.userCollection = brand.userCollection

          authState.user = response.user
          authState.token = response.access_token
          authState.cookieKey = response.cookie_key
          authState.isAuthenticated = true

          saveAuthState()

          // Buscar perfil completo do usuário (incluindo wallet/balance)
          await fetchUserProfile()

          return { success: true }
        } catch (err: any) {
          lastError = err
          // Credenciais não encontradas nessa marca: tenta a próxima.
        }
      }

      // Nenhuma marca autenticou
      console.error('Erro no login:', lastError)

      let message = 'Erro ao fazer login. Tente novamente.'

      const detail = lastError?.data?.detail
      const detailText = `${detail?.x || ''} ${detail?.error || ''}`.toLowerCase()

      if (detail?.reason === 'wrong_credentials' || /authenticate|unable|password/.test(detailText)) {
        message = 'E-mail/CPF ou senha incorretos.'
      } else if (detail?.reason === 'user_not_found') {
        message = 'Usuário não encontrado.'
      } else if (lastError?.statusCode === 401) {
        message = 'Credenciais inválidas.'
      } else if (lastError?.data?.message) {
        message = lastError.data.message
      }

      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  // Logout
  const logout = async () => {
    loading.value = true

    try {
      if (authState.token && authState.cookieKey) {
        await $fetch(`${authState.apiBaseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.token}`,
            'X-Brand-Slug': authState.brandSlug,
            'X-Base-Domain': authState.baseDomain,
            'X-Cactus-Cookie-Key': authState.cookieKey.toString()
          },
          body: {
            cookie_key: authState.cookieKey.toString()
          }
        })
      }
    } catch (err) {
      console.error('Erro no logout:', err)
    } finally {
      clearAuth()
      loading.value = false
      navigateTo('/auth/login')
    }
  }

  // Verificar se usuário está autenticado
  const checkAuth = () => {
    loadAuthState()
    return authState.isAuthenticated
  }

  // Obter headers de autenticação para requisições
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${authState.token}`,
      'X-Brand-Slug': authState.brandSlug,
      'X-Base-Domain': authState.baseDomain,
      'X-Cactus-Cookie-Key': authState.cookieKey?.toString() || ''
    }
  }

  // Inicializar estado
  if (import.meta.client) {
    loadAuthState()
  }

  // Formatar balance para exibição
  const formattedBalance = computed(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(authState.balance)
  })

  return {
    // Estado
    user: computed(() => authState.user),
    token: computed(() => authState.token),
    cookieKey: computed(() => authState.cookieKey),
    isAuthenticated: computed(() => authState.isAuthenticated),
    balance: computed(() => authState.balance),
    needsKyc: computed(() => authState.needsKyc),
    kycChecked: computed(() => authState.kycChecked),
    // Marca (brand) ativa do usuário logado
    brandSlug: computed(() => authState.brandSlug),
    baseDomain: computed(() => authState.baseDomain),
    apiBaseUrl: computed(() => authState.apiBaseUrl),
    brandName: computed(() => getBrand(authState.brandSlug).name),
    affiliateUrl: computed(() => getBrand(authState.brandSlug).affiliateUrl),
    formattedBalance,
    loading: readonly(loading),
    error: readonly(error),
    
    // Métodos
    login,
    logout,
    checkAuth,
    getAuthHeaders,
    clearAuth,
    fetchUserProfile
  }
}
