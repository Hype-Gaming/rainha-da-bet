import { requirePaidUser } from '../utils/subscriptions'
import { getClientIp, rateLimit } from '../utils/rateLimit'

const CATALOGADOR_BASE = 'https://casino-data.grupoautoma.com'

// O upstream só responde a requisições cuja Origin esteja na whitelist dele.
// Sem esse header ele retorna 403 (independente do IP). O proxy injeta a origem
// autorizada para que a chamada server-side seja aceita.
//
// ATENÇÃO: é justamente isso que torna este endpoint sensível. Ao injetar a Origin
// autorizada, ele contorna o controle de acesso do upstream em nome de quem chamar.
// Enquanto esteve aberto, qualquer pessoa na internet tinha o conteúdo pago de graça
// e usava o nosso servidor como bypass da whitelist deles. Por isso agora ele exige
// sessão + assinatura ativa antes de qualquer coisa.
const CATALOGADOR_ORIGIN = process.env.CATALOGADOR_ORIGIN || 'https://app.rainhaclub.com'

// Teto para o `limit`. Sem isso, `?limit=999999` vira alavanca de DoS contra o
// upstream — com o nosso IP na frente, levando a culpa.
const MAX_LIMIT = 2000
const DEFAULT_LIMIT = 2000

export default defineEventHandler(async (event) => {
  const session = await requirePaidUser(event)

  // Assinante legítimo abre poucos jogos; este teto só incomoda quem está raspando.
  rateLimit({
    key: `catalogador:${session.email}`,
    limit: 120,
    windowMs: 60 * 1000
  })
  rateLimit({
    key: `catalogador-ip:${getClientIp(event)}`,
    limit: 300,
    windowMs: 60 * 1000
  })

  const query = getQuery(event)

  const collection = typeof query.collection === 'string' ? query.collection : ''
  const game = typeof query.game === 'string' ? query.game : ''
  const date = typeof query.date === 'string' ? query.date : undefined

  const requestedLimit = Number.parseInt(String(query.limit ?? ''), 10)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT

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
