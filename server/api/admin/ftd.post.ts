import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const adminEmail = await requireAdmin(event)

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const amount = Number(body?.amount)

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw createError({ statusCode: 400, message: 'Valor inválido' })
  }

  const db = await getDb()
  await db.collection('deposits').insertOne({
    email,
    brand_slug: body?.brand_slug ?? null,
    amount,
    transaction_id: null,
    status: 'generated',
    is_ftd: true,
    source: 'admin-ftd',
    registered_by: adminEmail,
    created_at: new Date()
  })

  return { ok: true, email, amount }
})
