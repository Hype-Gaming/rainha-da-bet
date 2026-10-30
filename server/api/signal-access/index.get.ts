import { requireSession, routesAuthHeaders } from '../../utils/session'
import { availableMeetsMinimum, gameIds, getSignalSettings, normalizeEmail } from '../../utils/signalAccess'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const session = requireSession(event)
  const game = getQuery(event).game
  if (typeof game !== 'string' || !gameIds.includes(game)) throw createError({ statusCode: 400, message: 'Jogo inválido.' })
  const settings = await getSignalSettings()
  const minimumCents = settings.minimums[game]!
  const base = useRuntimeConfig().public.routesApiBase as string
  const headers = routesAuthHeaders(session)
  // Valida a sessão na origem mesmo quando o e-mail tem autorização especial.
  const me = await $fetch<{ user?: { email?: string } }>(`${base}/auth/me`, { headers })
  const email = typeof me.user?.email === 'string' ? normalizeEmail(me.user.email) : ''
  if (!email || email !== normalizeEmail(session.user.email)) throw createError({ statusCode: 401, message: 'Sessão inválida.' })
  if (settings.emails.includes(email)) return { allowed: true, minimumCents }
  const response = await $fetch<{ balances?: Array<{ currency?: string; available?: string }> }>(`${base}/balances`, { headers })
  const balance = response.balances?.find(item => item.currency === 'BRL')
  if (!balance || typeof balance.available !== 'string' || !/^\d+(?:\.\d+)?$/.test(balance.available) || balance.available.length > 100) {
    throw createError({ statusCode: 502, message: 'Saldo BRL indisponível.' })
  }
  return { allowed: availableMeetsMinimum(balance.available, minimumCents), minimumCents }
})
