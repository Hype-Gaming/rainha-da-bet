import { getDb } from '../../utils/mongodb'
import { MOCK_TOURNAMENT } from '../../../shared/tournaments'
import { serializeTournament } from '../../utils/tournaments'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const db = await getDb()
  const doc = await db.collection('tournaments').findOne({ status: 'active' }, { sort: { updated_at: -1 } })
  return { tournament: doc ? serializeTournament(doc) : MOCK_TOURNAMENT, mocked: !doc }
})
