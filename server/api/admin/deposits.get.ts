import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))

  const db = await getDb()
  const col = db.collection('deposits')
  const [rows, total] = await Promise.all([
    col.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments({})
  ])

  return {
    deposits: rows.map((d) => ({
      email: d.email,
      brand_slug: d.brand_slug ?? null,
      amount: d.amount ?? 0,
      status: d.status ?? null,
      is_ftd: !!d.is_ftd,
      created_at: d.created_at ?? null
    })),
    total
  }
})
