import { requireAdmin } from '../../utils/admin'
import { getDb } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { search } = getQuery(event)
  const filter: Record<string, unknown> = {}
  if (typeof search === 'string' && search.trim()) {
    // Busca parcial por email (case-insensitive), escapando regex.
    const safe = search.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.email = { $regex: safe }
  }

  const db = await getDb()
  const subs = await db
    .collection('subscriptions')
    .find(filter)
    .sort({ updated_at: -1 })
    .limit(100)
    .toArray()

  return {
    subscriptions: subs.map((s) => ({
      email: s.email,
      status: s.status ?? null,
      role: s.role ?? null,
      product: s.product ?? null,
      lastlink_status: s.lastlink_status ?? null,
      updated_at: s.updated_at ?? null,
      created_at: s.created_at ?? null
    }))
  }
})
