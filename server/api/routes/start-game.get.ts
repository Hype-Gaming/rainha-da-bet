import { requireSession, routesAuthHeaders } from '../../utils/session'

const safeUpstreamText = (value: unknown): string => {
  try {
    return (typeof value === 'string' ? value : JSON.stringify(value)).slice(0, 2000)
  } catch {
    return '[resposta não serializável]'
  }
}

const hasKycError = (value: unknown): boolean =>
  /\bkyc\b|verifica(?:ç|c)[aã]o (?:de identidade|necess[aá]ria|obrigat[oó]ria)|identity verification|document(?:o|os)? (?:obrigat[oó]rio|required|verification)/i.test(safeUpstreamText(value))

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const gameSlug = String(getQuery(event).slug || '').trim()
  if (!gameSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Requisição inválida' })
  }

  // O velvet endereça o jogo por provider/jogo; o catálogo (gameRoutes.ts)
  // guarda os dois juntos no startGameSlug ("evolution/bac-bo").
  const slash = gameSlug.indexOf('/')
  if (slash <= 0 || slash === gameSlug.length - 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'gameSlug deve ser "provider/jogo".',
      data: { code: 'GAME_SLUG_INVALID' },
    })
  }
  const provider = gameSlug.slice(0, slash)
  const gameCode = gameSlug.slice(slash + 1)

  const config = useRuntimeConfig()
  const routesApi = config.public.routesApiBase as string

  try {
    const response = await $fetch<any>(
      `${routesApi}/games/${encodeURIComponent(provider)}/${encodeURIComponent(gameCode)}/launch`,
      { method: 'POST', headers: routesAuthHeaders(session) },
    )

    // O velvet devolve launchUrl; o front antigo espera game_url.
    const gameUrl = response?.launchUrl || response?.game_url || ''
    if (!gameUrl) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Jogo recusado',
        data: { code: 'START_GAME_REJECTED' },
      })
    }

    return { success: true, game_url: gameUrl, game: response?.game, supplier: response?.supplier }
  } catch (error: any) {
    if (error?.data?.code) throw error

    const status = Number(error?.statusCode || error?.status || error?.response?.status || 502)
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: 'Sessão expirada', data: { code: 'SESSION_EXPIRED' } })
    }

    const upstream = error?.data || error?.response?._data || error?.message
    const code = hasKycError(upstream) ? 'KYC_REQUIRED' : 'START_GAME_REJECTED'
    console.warn('[start-game] recusado', JSON.stringify({
      email: session.user.email, gameSlug, status, reason: code, upstream: safeUpstreamText(upstream),
    }))
    throw createError({
      statusCode: code === 'KYC_REQUIRED' ? 403 : (status >= 400 && status < 500 ? status : 502),
      statusMessage: code === 'KYC_REQUIRED' ? 'Verificação necessária' : 'Jogo recusado',
      data: { code },
    })
  }
})
