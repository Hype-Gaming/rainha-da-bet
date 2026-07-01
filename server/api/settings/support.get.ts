import { getDb } from '../../utils/mongodb'
import { resolveSupportHref } from '../../utils/support'

// Endpoint PÚBLICO: fornece o link de suporte do WhatsApp para o app (BlockedOverlay).
// Retorna o valor cru (para preencher o campo no admin) e o href já resolvido.
export default defineEventHandler(async () => {
  const db = await getDb()
  const doc = await db.collection('settings').findOne({ key: 'support_whatsapp' })
  const value = typeof doc?.value === 'string' ? doc.value : ''

  return { value, href: resolveSupportHref(value) }
})
