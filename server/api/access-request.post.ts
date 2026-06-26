import { getDb } from '../utils/mongodb'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const email = String(body?.email || '').trim().toLowerCase()
  const name = body?.name ? String(body.name).trim() : null
  const phone = body?.phone ? String(body.phone).trim() : null

  if (!email || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, message: 'Email inválido' })
  }

  const db = await getDb()
  const col = db.collection('access_requests')

  // Sem duplicatas: reaproveita o pedido pendente do mesmo email, se existir.
  await col.updateOne(
    { email, status: 'pending' },
    {
      $set: {
        email,
        name,
        phone,
        status: 'pending',
        updated_at: new Date()
      },
      $setOnInsert: {
        created_at: new Date(),
        resolved_at: null
      }
    },
    { upsert: true }
  )

  return { ok: true }
})
