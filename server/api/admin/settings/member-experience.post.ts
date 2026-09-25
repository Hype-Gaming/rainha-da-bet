import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { normalizeMemberExperience } from '../../../utils/memberExperience'

export default defineEventHandler(async (event) => {
  const adminEmail = await requireAdmin(event)
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, message: 'Configuração inválida.' })
  }
  const config = normalizeMemberExperience(body)
  const db = await getDb()
  await db.collection('settings').updateOne(
    { key: 'member_experience' },
    { $set: { ...config, key: 'member_experience', updated_at: new Date(), updated_by: adminEmail } },
    { upsert: true }
  )
  return config
})
