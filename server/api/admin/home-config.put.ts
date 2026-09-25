import { HOME_TENANT, type HomeConfig } from '../../../shared/homeConfig'
import { getDb } from '../../utils/mongodb'
import { requireAdmin } from '../../utils/admin'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))
// Imagens vão como data URL dentro da config (limite por imagem).
const link = (v: any) => ({
  label: str(v?.label, 60), icon: str(v?.icon, 300) || 'ph:star-bold', href: str(v?.href, 500) || '#',
  description: str(v?.description, 160), image: str(v?.image, 400_000), external: !!v?.external
})

export default defineEventHandler(async (event) => {
  const adminEmail = await requireAdmin(event)
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError({ statusCode: 400, message: 'Configuração inválida.' })
  if (body.tenant !== HOME_TENANT) throw createError({ statusCode: 400, message: 'Tenant inválido.' })
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : [])
  const config: HomeConfig = {
    tenant: HOME_TENANT,
    liveTitle: str(body.liveTitle, 100), liveAt: str(body.liveAt, 60), liveHref: str(body.liveHref, 500),
    heroVideo: str(body.heroVideo, 500),
    banners: list(body.banners, 10).map((b: any) => ({ image: str(b?.image, 1_500_000), href: str(b?.href, 500) || '#', external: !!b?.external })),
    xpLabel: str(body.xpLabel, 60), xpCurrent: num(body.xpCurrent), xpGoal: Math.max(1, num(body.xpGoal)),
    members: num(body.members), playingNow: num(body.playingNow),
    shortcuts: list(body.shortcuts, 10).map(link).filter((l: any) => l.label),
    connectionLinks: list(body.connectionLinks, 12).map(link).filter((l: any) => l.label)
  }
  const db = await getDb()
  await db.collection('site_configs').updateOne(
    { tenant: HOME_TENANT },
    { $set: { ...config, updated_at: new Date(), updated_by: adminEmail } },
    { upsert: true }
  )
  return config
})
