import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'

// Lista os agendamentos: todos os ativos + os últimos finalizados/cancelados.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const docs = await db
    .collection('scheduled_notifications')
    .find({})
    .sort({ status: 1, nextRunAt: 1, createdAt: -1 })
    .limit(50)
    .toArray()

  return docs.map((d) => ({
    id: d._id.toString(),
    title: d.title,
    body: d.body,
    url: d.url,
    type: d.type,
    time: d.time,
    nextRunAt: d.nextRunAt,
    status: d.status,
    lastSentAt: d.lastSentAt,
    lastResult: d.lastResult
  }))
})
