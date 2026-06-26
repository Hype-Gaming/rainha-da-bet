import { getDb } from './mongodb'

/**
 * Grava a assinatura no MESMO formato que o webhook da Lastlink usa.
 * Liberação manual não tem payload da Lastlink, então os campos lastlink_status,
 * lastlink_order_id e product ficam null — a estrutura do documento permanece
 * idêntica, sem campos novos.
 */
export const setSubscriptionStatus = async (email: string, active: boolean) => {
  const normalized = email.trim().toLowerCase()
  const db = await getDb()
  const col = db.collection('subscriptions')

  await col.updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        status: active ? 'active' : 'inactive',
        role: active ? 'paid' : 'free',
        lastlink_status: null,
        lastlink_order_id: null,
        product: null,
        updated_at: new Date()
      },
      $setOnInsert: {
        created_at: new Date()
      }
    },
    { upsert: true }
  )

  return normalized
}
