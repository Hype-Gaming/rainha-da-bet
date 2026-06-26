import { requireAdmin } from '../../utils/admin'
import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const subs = db.collection('subscriptions')
  const requests = db.collection('access_requests')

  const [active, inactive, pending] = await Promise.all([
    subs.countDocuments({ status: 'active' }),
    subs.countDocuments({ status: 'inactive' }),
    requests.countDocuments({ status: 'pending' })
  ])

  return { active, inactive, pending }
})
