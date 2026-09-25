import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'
import { serializeTournament } from '../../utils/tournaments'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = await getDb()
  const docs = await db.collection('tournaments').find().sort({ updated_at: -1 }).limit(50).toArray()
  return { tournaments: docs.map(serializeTournament) }
})
