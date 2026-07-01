import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { resolveSupportHref } from '../../../utils/support'

// Endpoint PROTEGIDO: salva o valor cru do WhatsApp de suporte (link ou número).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const value = String(body?.value || '').trim()

  const db = await getDb()
  await db.collection('settings').updateOne(
    { key: 'support_whatsapp' },
    { $set: { key: 'support_whatsapp', value } },
    { upsert: true }
  )

  return { ok: true, value, href: resolveSupportHref(value) }
})
