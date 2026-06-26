import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const { email } = getQuery(event)

  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }

  const e = email.toLowerCase()
  const db = await getDb()

  // Bloqueio do painel admin manda: usuário bloqueado perde o acesso, mesmo com assinatura ativa.
  const [subscription, appUser] = await Promise.all([
    db.collection('subscriptions').findOne({ email: e }),
    db.collection('app_users').findOne({ email: e }, { projection: { blocked: 1 } })
  ])

  const blocked = !!appUser?.blocked
  const active = !blocked && subscription?.status === 'active'

  return {
    active,
    role: active ? 'paid' : 'free',
    status: blocked ? 'blocked' : (subscription?.status || null),
    blocked
  }
})
