import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const email = String((await readBody(event))?.email || '').trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'Email obrigatório' })
  const now = new Date()
  await (await getDb()).collection('app_users').updateOne(
    { email },
    { $set: { intro_video_watched_at: now }, $setOnInsert: { email, first_seen_at: now, blocked: false, blocked_at: null } },
    { upsert: true }
  )
  return { ok: true }
})
