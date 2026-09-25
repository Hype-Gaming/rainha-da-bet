import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const email = String(getQuery(event).email || '').trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'Email obrigatório' })
  const user = await (await getDb()).collection('app_users').findOne({ email }, { projection: { intro_video_watched_at: 1 } })
  return { watched: !!user?.intro_video_watched_at }
})
