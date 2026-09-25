import { getDb } from '../../utils/mongodb'
import { normalizeMemberExperience } from '../../utils/memberExperience'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const db = await getDb()
  const doc = await db.collection('settings').findOne({ key: 'member_experience' })
  return normalizeMemberExperience(doc)
})
