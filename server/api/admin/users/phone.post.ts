import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const raw = String(body?.phone || '').trim()
  const phone = raw || null

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }

  const db = await getDb()
  // grava no registro de usuário (cria se for assinante-only) e na assinatura, se existir
  await db.collection('app_users').updateOne(
    { email },
    { $set: { email, phone } },
    { upsert: true }
  )
  await db.collection('subscriptions').updateOne({ email }, { $set: { phone } })

  return { ok: true, email, phone }
})
