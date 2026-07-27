import { getDb } from '../utils/mongodb'
import { getClientIp, rateLimit } from '../utils/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  // Endpoint necessariamente público (quem pede acesso ainda não tem conta).
  // O upsert por e-mail evita duplicatas, mas nada impedia inundar a fila de
  // pedidos com e-mails diferentes — o painel admin viraria inútil.
  rateLimit({
    key: `access-request:${getClientIp(event)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
    message: 'Muitos pedidos enviados. Tente novamente mais tarde.'
  })

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
