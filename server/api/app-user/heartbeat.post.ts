import { getDb } from '../../utils/mongodb'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Registra a presença de um usuário autenticado no app (heartbeat).
 * Cria/atualiza o documento em app_users — primeira vez grava first_seen_at;
 * toda chamada atualiza last_seen_at. Alimenta a tabela de usuários do painel admin.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, message: 'Email inválido' })
  }

  const now = new Date()
  const set: Record<string, unknown> = { email, last_seen_at: now }

  if (body?.name) set.name = String(body.name).trim()
  if (body?.phone) set.phone = String(body.phone).trim()
  if (body?.brand_slug) set.brand_slug = String(body.brand_slug).trim()
  if (body?.cactus_user_id != null) set.cactus_user_id = body.cactus_user_id

  const db = await getDb()
  const doc = await db.collection('app_users').findOneAndUpdate(
    { email },
    {
      $set: set,
      $setOnInsert: { first_seen_at: now, blocked: false }
    },
    { upsert: true, returnDocument: 'after' }
  )

  return { ok: true, blocked: !!doc?.blocked }
})
