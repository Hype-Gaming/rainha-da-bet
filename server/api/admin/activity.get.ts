import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'

const TZ = 'America/Sao_Paulo'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 13) // 14 dias incluindo hoje

  const groupByDay = (field: string) => [
    { $match: { [field]: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: TZ } },
        n: { $sum: 1 }
      }
    }
  ]

  const [users, deps] = await Promise.all([
    db.collection('app_users').aggregate(groupByDay('first_seen_at')).toArray(),
    db.collection('deposits').aggregate(groupByDay('created_at')).toArray()
  ])

  const umap = Object.fromEntries(users.map((u) => [u._id, u.n]))
  const dmap = Object.fromEntries(deps.map((d) => [d._id, d.n]))

  const days: Array<{ date: string; users: number; deposits: number }> = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
    days.push({ date: key, users: umap[key] || 0, deposits: dmap[key] || 0 })
  }

  return { days }
})
