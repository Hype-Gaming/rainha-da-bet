import { BRANDS } from '../../shared/brands'

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
  const query = getQuery(event)
  const gameSlug = String(query.slug || '').trim()
  const brandSlug = String(getRequestHeader(event, 'x-brand-slug') || '').trim()
  const brand = BRANDS.find((item) => item.slug === brandSlug)
  const authorization = getRequestHeader(event, 'authorization')
  const cookieKey = getRequestHeader(event, 'x-cactus-cookie-key')
  const playerEmail = String(getRequestHeader(event, 'x-player-email') || '').slice(0, 254)
  const playerId = String(getRequestHeader(event, 'x-player-id') || '').slice(0, 64)

  if (!brand || !gameSlug || !authorization || !cookieKey) {
    throw createError({ statusCode: 400, statusMessage: 'Requisição inválida' })
  }

  try {
    const response = await $fetch<any>(`${brand.apiBaseUrl}/api/start-game`, {
      method: 'GET',
      params: { slug: gameSlug, platform: String(query.platform || 'WEB'), use_demo: 0 },
      headers: {
        Authorization: authorization,
        'X-Brand-Slug': brand.slug,
        'X-Base-Domain': brand.baseDomain,
        'X-Cactus-Cookie-Key': cookieKey
      }
    })

    const rejected = response?.success === false || response?.error === true || response?.payload?.error === true
    if (rejected) {
      const code = hasKycError(response) ? 'KYC_REQUIRED' : 'START_GAME_REJECTED'
      console.warn('[start-game] recusado', JSON.stringify({
        email: playerEmail || undefined, playerId: playerId || undefined, gameSlug,
        status: 502, reason: code, upstream: safeUpstreamText(response)
      }))
      throw createError({
        statusCode: code === 'KYC_REQUIRED' ? 403 : 502,
        statusMessage: code === 'KYC_REQUIRED' ? 'Verificação necessária' : 'Jogo recusado',
        data: { code }
      })
    }

    return response
  } catch (error: any) {
    if (error?.data?.code === 'KYC_REQUIRED' || error?.data?.code === 'START_GAME_REJECTED') throw error

    const status = Number(error?.statusCode || error?.status || error?.response?.status || 502)
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: 'Sessão expirada', data: { code: 'SESSION_EXPIRED' } })
    }

    const upstream = error?.data || error?.response?._data || error?.message
    const code = hasKycError(upstream) ? 'KYC_REQUIRED' : 'START_GAME_REJECTED'
    console.warn('[start-game] recusado', JSON.stringify({
      email: playerEmail || undefined, playerId: playerId || undefined, gameSlug,
      status, reason: code, upstream: safeUpstreamText(upstream)
    }))
    throw createError({
      statusCode: code === 'KYC_REQUIRED' ? 403 : (status >= 400 && status < 500 ? status : 502),
      statusMessage: code === 'KYC_REQUIRED' ? 'Verificação necessária' : 'Jogo recusado',
      data: { code }
    })
  }
})
