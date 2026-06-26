const CATALOGADOR_BASE = 'https://casino-data.grupoautoma.com'

// O upstream só responde a requisições cuja Origin esteja na whitelist dele.
// Sem esse header ele retorna 403 (independente do IP). O proxy injeta a origem
// autorizada para que a chamada server-side seja aceita.
const CATALOGADOR_ORIGIN = process.env.CATALOGADOR_ORIGIN || 'https://app.rainhaclub.com'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const collection = typeof query.collection === 'string' ? query.collection : ''
  const game = typeof query.game === 'string' ? query.game : ''
  const limit = typeof query.limit === 'string' ? query.limit : '2000'
  const date = typeof query.date === 'string' ? query.date : undefined

  if (!collection || !game) {
    throw createError({
      statusCode: 400,
      message: 'collection e game são obrigatórios'
    })
  }

  return await $fetch(`${CATALOGADOR_BASE}/results`, {
    params: {
      collection,
      game,
      limit,
      ...(date ? { date } : {})
    },
    headers: {
      Origin: CATALOGADOR_ORIGIN,
      Referer: `${CATALOGADOR_ORIGIN}/`
    }
  })
})
