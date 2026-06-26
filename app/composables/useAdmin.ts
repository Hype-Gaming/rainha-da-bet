// Composable do painel admin — auth PRÓPRIA, independente do Cactus.
// Login = e-mail + senha (validados no servidor contra o .env). A sessão é um token
// assinado guardado no localStorage e enviado em Authorization: Bearer <token>.

const TOKEN_STORAGE = 'rdb_admin_token'

const adminState = reactive({
  token: '',
  tokenLoaded: false,
  authed: false,
  checked: false,
  email: null as string | null
})

export const useAdmin = () => {
  // Carrega o token salvo (client-only) uma única vez.
  if (import.meta.client && !adminState.tokenLoaded) {
    adminState.token = localStorage.getItem(TOKEN_STORAGE) || ''
    adminState.tokenLoaded = true
  }

  const setToken = (value: string) => {
    adminState.token = value
    if (import.meta.client) {
      if (value) localStorage.setItem(TOKEN_STORAGE, value)
      else localStorage.removeItem(TOKEN_STORAGE)
    }
  }

  const adminFetch = async <T>(url: string, opts: Record<string, any> = {}): Promise<T> => {
    try {
      return await $fetch<T>(url, {
        ...opts,
        headers: {
          ...(adminState.token ? { Authorization: `Bearer ${adminState.token}` } : {}),
          ...(opts.headers || {})
        }
      })
    } catch (err: any) {
      const status = err?.status || err?.statusCode || err?.response?.status
      // Sessão expirada/inválida → derruba e força novo login.
      if (status === 401) {
        setToken('')
        adminState.authed = false
      }
      throw err
    }
  }

  // Verifica se a sessão atual é válida.
  const checkAdmin = async (): Promise<boolean> => {
    if (!adminState.token) {
      adminState.authed = false
      adminState.email = null
      adminState.checked = true
      return false
    }
    try {
      const res = await adminFetch<{ admin: boolean; email: string }>('/api/admin/me')
      adminState.authed = !!res.admin
      adminState.email = res.email
    } catch {
      adminState.authed = false
      adminState.email = null
    } finally {
      adminState.checked = true
    }
    return adminState.authed
  }

  // Faz login com e-mail + senha; guarda o token em caso de sucesso.
  const login = async (email: string, password: string): Promise<void> => {
    const res = await $fetch<{ token: string; email: string }>('/api/admin/login', {
      method: 'POST',
      body: { email, password }
    })
    setToken(res.token)
    adminState.authed = true
    adminState.email = res.email
    adminState.checked = true
  }

  const logout = () => {
    setToken('')
    adminState.authed = false
    adminState.email = null
  }

  return {
    authed: computed(() => adminState.authed),
    needsLogin: computed(() => !adminState.authed),
    checked: computed(() => adminState.checked),
    adminEmail: computed(() => adminState.email),
    adminFetch,
    checkAdmin,
    login,
    logout
  }
}
