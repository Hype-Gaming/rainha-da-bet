import { requireAdmin } from '../../utils/admin'
import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { status } = getQuery(event)
  const filter: Record<string, unknown> = {}
  if (typeof status === 'string' && status) {
    filter.status = status
  }

  const db = await getDb()
  const requests = await db
    .collection('access_requests')
    .find(filter)
    .sort({ created_at: -1 })
    .limit(200)
    .toArray()

  return {
    requests: requests.map((r) => ({
      email: r.email,
      name: r.name ?? null,
      phone: r.phone ?? null,
      status: r.status,
      created_at: r.created_at ?? null,
      resolved_at: r.resolved_at ?? null
    }))
  }
})
