import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { buildUserEnrichmentStages, buildSubsOnlyUnion } from '../../../utils/adminUserEnrichment'

const csvCell = (v: unknown): string => {
  let s = v == null ? '' : String(v)
  // anti-injection: neutraliza fórmulas no Excel
  if (/^[=+\-@]/.test(s)) s = "'" + s
  if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

const fmtDate = (d: unknown): string =>
  d ? new Date(d as string).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''

const riskLabel = (t: string | null): string =>
  t === 'risk_24h' ? '24h' : t === 'risk_48h' ? '48h+' : t === 'risk_no_access' ? 'Pago nunca acessou' : ''

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const search = String(q.search || '').trim()
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
    { $limit: 50000 }
  ]

  const db = await getDb()
  const rows = await db.collection('app_users').aggregate(pipeline).toArray()

  const header = [
    'Nome', 'E-mail', 'Telefone', 'Assinatura', 'PIX (qtd)', 'Valor PIX',
    'Marca', '1º acesso', 'Último acesso', 'Status', 'Risco', 'Status contato'
  ]
  const lines = [header.join(';')]
  for (const u of rows) {
    lines.push([
      csvCell(u.name),
      csvCell(u.email),
      csvCell(u.phone),
      csvCell(u.subscription === 'paid' ? 'Pago' : 'Free'),
      csvCell(u.deposits_count ?? 0),
      csvCell((u.deposits_sum ?? 0).toFixed(2).replace('.', ',')),
      csvCell(u.brand_slug),
      csvCell(fmtDate(u.first_seen_at)),
      csvCell(fmtDate(u.last_seen_at)),
      csvCell(u.blocked ? 'Bloqueado' : 'Ativo'),
      csvCell(riskLabel(u.risk_tag)),
      csvCell(u.contact_status)
    ].join(';'))
  }

  const csv = '﻿' + lines.join('\r\n')
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="usuarios-rainha.csv"')
  return csv
})
