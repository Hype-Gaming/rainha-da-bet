import { getUserSession } from '../../utils/session'

/** Estado da sessão para o cliente hidratar. Nunca devolve o accessToken. */
export default defineEventHandler((event) => {
  const session = getUserSession(event)
  if (!session) return { authenticated: false, user: null, brandSlug: null }
  return {
    authenticated: true,
    user: session.user,
    brandSlug: session.brandSlug,
  }
})
