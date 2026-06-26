import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'
import { buildUserEnrichmentStages, buildSubsOnlyUnion, HOUR_MS } from '../../utils/adminUserEnrichment'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const now = new Date()
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)
  const cutoff7d = new Date(now.getTime() - 7 * 24 * HOUR_MS)
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)

  const appUsers = db.collection('app_users')
  const deposits = db.collection('deposits')

  // total de usuários, em risco e conversão via união + enriquecimento
  const enriched = await appUsers.aggregate([
    { $match: {} },
    ...buildSubsOnlyUnion(),
    ...buildUserEnrichmentStages(now),
    {
      $facet: {
        total: [{ $count: 'n' }],
        atRisk: [{ $match: { risk_tag: { $ne: null } } }, { $count: 'n' }],
        paid: [{ $match: { subscription: 'paid' } }, { $count: 'n' }],
        paidWithPix: [{ $match: { subscription: 'paid', deposits_count: { $gt: 0 } } }, { $count: 'n' }]
      }
    }
  ]).toArray()

  const f = enriched[0] || {}
  const totalUsers = f.total?.[0]?.n || 0
  const atRisk = f.atRisk?.[0]?.n || 0
  const paid = f.paid?.[0]?.n || 0
  const paidWithPix = f.paidWithPix?.[0]?.n || 0

  const [active48h, newToday, new7d, depAgg] = await Promise.all([
    appUsers.countDocuments({ last_seen_at: { $gte: cutoff48 } }),
    appUsers.countDocuments({ first_seen_at: { $gte: startToday } }),
    appUsers.countDocuments({ first_seen_at: { $gte: cutoff7d } }),
    deposits.aggregate([{ $group: { _id: null, count: { $sum: 1 }, sum: { $sum: '$amount' } } }]).toArray()
  ])

  const depositsCount = depAgg[0]?.count || 0
  const depositsSum = depAgg[0]?.sum || 0
  const avgTicket = depositsCount ? depositsSum / depositsCount : 0
  const conversionRate = paid ? (paidWithPix / paid) * 100 : 0

  return {
    totalUsers,
    active48h,
    depositsCount,
    depositsSum,
    newToday,
    new7d,
    avgTicket,
    atRisk,
    conversionRate
  }
})
