import { ObjectId } from 'mongodb'
import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { parseTournamentInput, serializeTournament } from '../../../utils/tournaments'

export default defineEventHandler(async (event) => {
  const adminEmail = await requireAdmin(event)
  const id = getRouterParam(event, 'id') || ''
  if (!ObjectId.isValid(id)) throw createError({ statusCode: 400, message: 'Torneio inválido.' })
  const input = parseTournamentInput(await readBody(event))
  const db = await getDb()
  const tournaments = db.collection('tournaments')
  const _id = new ObjectId(id)
  const now = new Date()
  if (input.status === 'active') await tournaments.updateMany({ status: 'active', _id: { $ne: _id } }, { $set: { status: 'finished', updated_at: now } })
  const doc = await tournaments.findOneAndUpdate(
    { _id },
    { $set: { ...input, starts_at: new Date(input.startsAt), ends_at: new Date(input.endsAt), updated_at: now, updated_by: adminEmail } },
    { returnDocument: 'after' }
  )
  if (!doc) throw createError({ statusCode: 404, message: 'Torneio não encontrado.' })
  return serializeTournament(doc)
})
