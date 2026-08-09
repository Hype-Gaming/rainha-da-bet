import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured } from '../../../utils/webpush'

// Resumo para o painel: quantos navegadores estão inscritos no push.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const collection = db.collection('push_subscriptions')

  const [total, withEmail] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ email: { $ne: null } })
  ])

  return {
    configured: isPushConfigured(),
    total,
    withEmail
  }
})
