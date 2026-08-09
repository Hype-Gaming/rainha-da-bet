import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured } from '../../../utils/webpush'
import { validatePushPayloadInput, type PushPayloadInput } from '../../../utils/pushPayloadInput'

interface ScheduledBody extends PushPayloadInput {
  type?: string
  runAt?: string
  time?: string
}

let indexEnsured = false

// Garante o índice { status, nextRunAt } uma vez por processo — é por ele que
// o scheduler (Task 11) vai varrer os agendamentos ativos e vencidos.
const ensureIndex = async (db: Awaited<ReturnType<typeof getDb>>): Promise<void> => {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await db.collection('scheduled_notifications').createIndex({ status: 1, nextRunAt: 1 })
  } catch (err) {
    // Falha transitória: libera a flag para a próxima requisição tentar de novo.
    indexEnsured = false
    console.error('[push] Falha ao criar índice de scheduled_notifications:', err)
  }
}

// Cria uma notificação agendada (única ou diária), a ser disparada pelo
// scheduler quando `nextRunAt` vencer.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor (VAPID ausente).' })
  }

  const body = await readBody<ScheduledBody>(event)
  const payload = validatePushPayloadInput(body)

  const type = body?.type === 'daily' ? 'daily' : 'once'

  // `runAt` chega como ISO string calculada pelo cliente (fuso local dele).
  // `new Date(...)` nunca lança, mesmo para entradas absurdas — só produz uma
  // data inválida, que detectamos via isNaN.
  const runAt = new Date(body?.runAt as any)
  if (isNaN(runAt.getTime())) {
    throw createError({ statusCode: 400, message: 'Data/horário do agendamento inválido.' })
  }

  // Só para agendamento único: dá 1 minuto de tolerância antes de recusar um
  // horário já passado (evita rejeitar por causa de pequeno atraso de rede).
  if (type === 'once' && runAt.getTime() < Date.now() - 60_000) {
    throw createError({ statusCode: 400, message: 'O horário escolhido já passou.' })
  }

  const rawTime = body?.time
  const time = typeof rawTime === 'string' && rawTime.trim() ? rawTime.trim() : null

  const db = await getDb()
  await ensureIndex(db)

  const result = await db.collection('scheduled_notifications').insertOne({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    icon: payload.icon,
    type,
    time,
    nextRunAt: runAt,
    status: 'active',
    createdAt: new Date(),
    lastSentAt: null,
    lastResult: null
  })

  return { ok: true, id: result.insertedId.toString() }
})
