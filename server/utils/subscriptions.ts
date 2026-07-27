import type { H3Event } from 'h3'
import { getDb } from './mongodb'
import { requireUser, type UserSession } from './session'

export interface SubscriptionState {
  active: boolean
  role: 'paid' | 'free'
  status: string | null
  blocked: boolean
}

/**
 * Estado de acesso do usuário da sessão.
 *
 * O e-mail de login (Cactus) nem sempre é o e-mail da compra (Lastlink). Quando o
 * usuário comprova a compra pelo modal, o e-mail dela fica gravado em
 * app_users.subscription_email — e a assinatura passa a valer para os dois.
 *
 * Bloqueio pelo painel admin tem precedência: bloqueado perde acesso mesmo pagando.
 */
export const getSubscriptionState = async (sessionEmail: string): Promise<SubscriptionState> => {
  const email = sessionEmail.trim().toLowerCase()
  const db = await getDb()

  const appUser = await db
    .collection('app_users')
    .findOne({ email }, { projection: { blocked: 1, subscription_email: 1 } })

  const candidates = [email]
  const linked = String(appUser?.subscription_email || '').trim().toLowerCase()
  if (linked && linked !== email) candidates.push(linked)

  // Uma consulta só: traz as assinaturas dos e-mails candidatos e prefere a ativa.
  const subscriptions = await db
    .collection('subscriptions')
    .find({ email: { $in: candidates } }, { projection: { status: 1 } })
    .toArray()

  const subscription =
    subscriptions.find((s) => s.status === 'active') ?? subscriptions[0] ?? null

  const blocked = !!appUser?.blocked
  const active = !blocked && subscription?.status === 'active'

  return {
    active,
    role: active ? 'paid' : 'free',
    status: blocked ? 'blocked' : (subscription?.status ?? null),
    blocked
  }
}

/**
 * Portão do conteúdo pago: exige sessão válida E assinatura ativa.
 *
 * É a checagem que faltava — antes o gate existia só no navegador (middleware de
 * rota), o que qualquer um contorna. Middleware de rota é experiência de usuário;
 * a fronteira de verdade é esta, no servidor.
 */
export const requirePaidUser = async (event: H3Event): Promise<UserSession> => {
  const session = requireUser(event)
  const state = await getSubscriptionState(session.email)

  if (!state.active) {
    throw createError({
      statusCode: 403,
      message: state.blocked ? 'Conta bloqueada' : 'Assinatura inativa',
      data: { needSubscription: !state.blocked, blocked: state.blocked }
    })
  }

  return session
}

/** Existe assinatura ativa para este e-mail? (usado ao vincular o e-mail da compra) */
export const hasActiveSubscription = async (email: string): Promise<boolean> => {
  const db = await getDb()
  const doc = await db
    .collection('subscriptions')
    .findOne({ email: email.trim().toLowerCase(), status: 'active' }, { projection: { _id: 1 } })
  return !!doc
}

/**
 * Grava a assinatura no MESMO formato que o webhook da Lastlink usa.
 * Liberação manual não tem payload da Lastlink, então os campos lastlink_status,
 * lastlink_order_id e product ficam null — a estrutura do documento permanece
 * idêntica, sem campos novos.
 */
export const setSubscriptionStatus = async (email: string, active: boolean) => {
  const normalized = email.trim().toLowerCase()
  const db = await getDb()
  const col = db.collection('subscriptions')

  await col.updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        status: active ? 'active' : 'inactive',
        role: active ? 'paid' : 'free',
        lastlink_status: null,
        lastlink_order_id: null,
        product: null,
        updated_at: new Date()
      },
      $setOnInsert: {
        created_at: new Date()
      }
    },
    { upsert: true }
  )

  return normalized
}
