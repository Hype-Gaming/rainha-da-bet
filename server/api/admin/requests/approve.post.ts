import { requireAdmin } from '../../../utils/admin'
import { getDb } from '../../../utils/mongodb'
import { setSubscriptionStatus } from '../../../utils/subscriptions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }

  // Libera a assinatura no mesmo formato do webhook.
  await setSubscriptionStatus(email, true)

  // Marca o pedido como aprovado (idempotente caso já não exista).
  const db = await getDb()
  await db.collection('access_requests').updateMany(
    { email, status: 'pending' },
    { $set: { status: 'approved', resolved_at: new Date() } }
  )

  return { ok: true, email, status: 'active' }
})
