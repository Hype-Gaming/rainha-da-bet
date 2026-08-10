import { ObjectId } from 'mongodb'
import { getDb } from '../../../../utils/mongodb'
import { requireAdmin } from '../../../../utils/admin'

// Cancela (remove) um agendamento pelo id.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, message: 'Id de agendamento inválido.' })
  }

  const db = await getDb()
  const result = await db.collection('scheduled_notifications').deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, message: 'Agendamento não encontrado.' })
  }

  return { ok: true }
})
