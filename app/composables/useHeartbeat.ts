// Registra a presença do usuário logado no app (alimenta app_users / painel admin).
export const useHeartbeat = () => {
  const { user, brandSlug } = useAuth()
  const { setBlocked } = useAccountBlocked()

  const send = async () => {
    const u = user.value
    if (!u?.email) return
    try {
      const res = await $fetch<{ ok: boolean; blocked?: boolean }>('/api/app-user/heartbeat', {
        method: 'POST',
        body: {
          email: u.email,
          name: u.name,
          phone: u.phone,
          brand_slug: brandSlug.value,
          cactus_user_id: u.id
        }
      })
      // Reflete o bloqueio feito no painel admin (trava o app via overlay).
      setBlocked(!!res?.blocked)
    } catch {
      // silencioso: heartbeat nunca deve atrapalhar o uso do app
    }
  }

  return { send }
}
