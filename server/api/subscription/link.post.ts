import { getDb } from '../../utils/mongodb'
import { requireUser } from '../../utils/session'
import { getSubscriptionState, hasActiveSubscription } from '../../utils/subscriptions'
import { rateLimit, resetRateLimit } from '../../utils/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Vincula o e-mail da COMPRA (Lastlink) à conta logada (Cactus).
 *
 * Por que existe: os dois e-mails podem ser diferentes, e o usuário precisa de um
 * jeito de comprovar a compra. Este é o único ponto do sistema que consulta um
 * e-mail que não é o da sessão — então ele é cercado:
 *
 *  1. exige sessão válida (não é um endpoint público);
 *  2. é limitado por sessão (não dá para varrer a base tentando e-mails);
 *  3. responde só `{ active }` — nunca nome, status detalhado ou telefone.
 *
 * Com isso, "adivinhar" um e-mail assinante custa muito e entrega quase nada.
 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)

  const key = `subscription-link:${session.email}`
  rateLimit({
    key,
    limit: 5,
    windowMs: 10 * 60 * 1000,
    message: 'Muitas tentativas de verificação. Aguarde alguns minutos.'
  })

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()

  if (!email || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, message: 'E-mail inválido' })
  }

  const active = await hasActiveSubscription(email)

  if (!active) {
    // Resposta idêntica para "e-mail não existe" e "existe mas não está ativo":
    // distinguir os dois casos seria devolver a enumeração pela porta dos fundos.
    return { active: false }
  }

  // Acertou: guarda o vínculo para os próximos acessos não precisarem digitar de novo.
  const db = await getDb()
  await db.collection('app_users').updateOne(
    { email: session.email },
    {
      $set: { email: session.email, subscription_email: email, updated_at: new Date() },
      $setOnInsert: { first_seen_at: new Date(), blocked: false }
    },
    { upsert: true }
  )

  resetRateLimit(key)

  return await getSubscriptionState(session.email)
})
