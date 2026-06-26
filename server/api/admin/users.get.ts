import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'
import { buildUserEnrichmentStages, buildSubsOnlyUnion } from '../../utils/adminUserEnrichment'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const search = String(q.search || '').trim()
  const skip = Math.max(0, parseInt(String(q.skip)) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(String(q.limit)) || 50))
  const risk = String(q.risk || '')
  const subscription = String(q.subscription || '')
  const status = String(q.status || '')
  const brand = String(q.brand || '').trim()
  const rx = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null

  const match: Record<string, any> = {}
  if (rx) match.$or = [{ email: rx }, { name: rx }, { phone: rx }]
  if (status === 'active') match.blocked = { $ne: true }
  if (status === 'blocked') match.blocked = true
  if (brand) match.brand_slug = brand

  // assinantes-only só fazem sentido quando não filtra por bloqueados nem por marca
  const includeSubsOnly = status !== 'blocked' && !brand
  const subUnion = includeSubsOnly ? buildSubsOnlyUnion(rx) : []

  const post: Record<string, any> = {}
  if (subscription === 'paid' || subscription === 'free') post.subscription = subscription
  if (risk === '24h') post.risk_tag = 'risk_24h'
  if (risk === '48h') post.risk_tag = 'risk_48h'
  if (risk === 'no_access') post.risk_tag = 'risk_no_access'
  if (risk === 'any') post.risk_tag = { $ne: null }

  const pipeline: any[] = [
    { $match: match },
    ...subUnion,
    ...buildUserEnrichmentStages(),
    ...(Object.keys(post).length ? [{ $match: post }] : []),
    { $sort: { last_seen_at: -1 } },
    { $facet: { rows: [{ $skip: skip }, { $limit: limit }], meta: [{ $count: 'total' }] } }
  ]

  const db = await getDb()
  const col = db.collection('app_users')
  const [agg, brands] = await Promise.all([
    col.aggregate(pipeline).toArray(),
    col.distinct('brand_slug', { brand_slug: { $nin: [null, ''] } })
  ])
  const r = agg[0]
  return {
    users: r?.rows || [],
    total: r?.meta?.[0]?.total || 0,
    brands: (brands as string[]).sort()
  }
})
