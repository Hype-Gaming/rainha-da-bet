// Wrapper de $fetch para os endpoints do NOSSO servidor (/api/*).
//
// Problema que resolve: a sessão do servidor (cookie, 7 dias) e o estado do cliente
// (localStorage, sem prazo) expiram em momentos diferentes. Quando o cookie morre
// primeiro, o usuário continua "logado" na tela mas toma 401 nas chamadas.
//
// Em vez de espalhar tratamento de 401 por toda página, centralizamos aqui: um 401
// dispara uma tentativa de reabrir a sessão e repete a chamada UMA vez. Se ainda
// assim falhar, o erro sobe normalmente.

export const useApi = () => {
  const { ensureSession } = useAuth()

  const apiFetch = async <T>(url: string, options: Record<string, any> = {}): Promise<T> => {
    try {
      return (await $fetch<T>(url, options)) as T
    } catch (err: any) {
      const status = err?.status || err?.statusCode || err?.response?.status
      if (status !== 401) throw err

      // Uma única retentativa: se a troca de token não resolver, o erro é real.
      const recovered = await ensureSession()
      if (!recovered) throw err

      return (await $fetch<T>(url, options)) as T
    }
  }

  return { apiFetch }
}
