import { ObjectId } from 'mongodb'
import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'
import { parseTournamentInput, serializeTournament } from '../../utils/tournaments'

export default defineEventHandler(async (event) => {
  const adminEmail = await requireAdmin(event)
  const input = parseTournamentInput(await readBody(event))
  const db = await getDb()
  const tournaments = db.collection('tournaments')
  const now = new Date()
  if (input.status === 'active') await tournaments.updateMany({ status: 'active' }, { $set: { status: 'finished', updated_at: now } })
  const result = await tournaments.insertOne({
    _id: new ObjectId(), ...input, starts_at: new Date(input.startsAt), ends_at: new Date(input.endsAt),
    created_at: now, updated_at: now, updated_by: adminEmail
  })
  const doc = await tournaments.findOne({ _id: result.insertedId })
  return serializeTournament(doc)
})
