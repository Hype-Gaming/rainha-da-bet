import { getDb } from '../../utils/mongodb'
import { requireUser } from '../../utils/session'

/**
 * Registra a presença do usuário autenticado no app (heartbeat).
 * Cria/atualiza o documento em app_users — primeira vez grava first_seen_at;
 * toda chamada atualiza last_seen_at. Alimenta a tabela de usuários do painel admin.
 *
 * A identidade vem EXCLUSIVAMENTE da sessão. Antes vinha do body, o que permitia a
 * qualquer um criar usuários fantasma (poluindo as métricas do painel) e, pior,
 * sobrescrever nome e telefone de usuários reais.
 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)

  const now = new Date()
  const set: Record<string, unknown> = { email: session.email, last_seen_at: now }

  // Dados do perfil confirmado pelo Cactus, não do corpo da requisição.
  if (session.name) set.name = session.name
  if (session.phone) set.phone = session.phone
  if (session.brandSlug) set.brand_slug = session.brandSlug
  if (session.cactusUserId != null) set.cactus_user_id = session.cactusUserId

  const db = await getDb()
  const doc = await db.collection('app_users').findOneAndUpdate(
    { email: session.email },
    {
      $set: set,
      $setOnInsert: { first_seen_at: now, blocked: false }
    },
    { upsert: true, returnDocument: 'after' }
  )

  return { ok: true, blocked: !!doc?.blocked }
})
