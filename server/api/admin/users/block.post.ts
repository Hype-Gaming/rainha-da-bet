import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const blocked = !!body?.blocked

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }

  const db = await getDb()
  // upsert cobre o assinante-only (que ainda não tem registro em app_users)
  await db.collection('app_users').updateOne(
    { email },
    { $set: { email, blocked, blocked_at: blocked ? new Date() : null } },
    { upsert: true }
  )

  return { ok: true, email, blocked }
})
