import { requireAdmin } from '../../../utils/admin'
import { getDb } from '../../../utils/mongodb'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }

  const db = await getDb()
  await db.collection('access_requests').updateMany(
    { email, status: 'pending' },
    { $set: { status: 'rejected', resolved_at: new Date() } }
  )

  return { ok: true, email, status: 'rejected' }
})
