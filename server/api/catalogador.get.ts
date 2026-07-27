import { requireUser } from '../utils/session'
import { assertActiveSubscription } from '../utils/subscriptions'
import { isFreeCatalogadorTarget } from '../../shared/catalogadorAccess'
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
  // Sessão é SEMPRE exigida: é o que impede a internet inteira de baixar o
  // conteúdo sem login. A assinatura é checada mais abaixo, e só para os jogos
  // que não são livres — o jogo livre é o funil de aquisição e precisa continuar
  // funcionando para quem ainda não assinou.
  const session = requireUser(event)

  // Usuário legítimo abre poucos jogos; este teto só incomoda quem está raspando.
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

  // O gate de assinatura pertence ao JOGO pedido, não ao endpoint: o catalogador
  // serve tanto o jogo livre quanto os premium. A lista de livres está em
  // shared/catalogadorAccess.ts e precisa espelhar o bloco "Prime" da home.
  if (!isFreeCatalogadorTarget(collection, game)) {
    await assertActiveSubscription(session.email)
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
