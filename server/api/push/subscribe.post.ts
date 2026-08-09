import { getDb } from '../../utils/mongodb'

interface SubscribeBody {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  email?: string | null
}

let indexEnsured = false

// Garante o índice único em `endpoint` uma vez por processo. Falha de índice
// nunca deve derrubar a inscrição do usuário, então o erro é só logado.
const ensureIndex = async (db: Awaited<ReturnType<typeof getDb>>): Promise<void> => {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await db.collection('push_subscriptions').createIndex({ endpoint: 1 }, { unique: true })
  } catch (err) {
    console.error('[push] Falha ao criar índice de push_subscriptions:', err)
  }
}

// Salva (ou atualiza) a inscrição de push do navegador na collection
// `push_subscriptions`, chaveada pelo endpoint (único por navegador/dispositivo).
export default defineEventHandler(async (event) => {
  const body = await readBody<SubscribeBody>(event)
  const sub = body?.subscription

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw createError({ statusCode: 400, message: 'Inscrição de push inválida.' })
  }

  const db = await getDb()
  await ensureIndex(db)

  const now = new Date()
  const email = body.email?.trim().toLowerCase() || null

  await db.collection('push_subscriptions').updateOne(
    { endpoint: sub.endpoint },
    {
      $set: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        email,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  )

  return { ok: true }
})
