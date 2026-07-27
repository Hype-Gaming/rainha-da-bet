// Registra a presença do usuário logado no app (alimenta app_users / painel admin).
//
// O corpo não carrega mais e-mail/nome/telefone: o servidor lê tudo da sessão.
// Mandar identidade pelo body era exatamente o que permitia forjar usuários.
export const useHeartbeat = () => {
  const { user } = useAuth()
  const { setBlocked } = useAccountBlocked()
  const { apiFetch } = useApi()

  const send = async () => {
    if (!user.value?.email) return
    try {
      const res = await apiFetch<{ ok: boolean; blocked?: boolean }>('/api/app-user/heartbeat', {
        method: 'POST'
      })
      // Reflete o bloqueio feito no painel admin (trava o app via overlay).
      setBlocked(!!res?.blocked)
    } catch {
      // silencioso: heartbeat nunca deve atrapalhar o uso do app
    }
  }

  return { send }
}
