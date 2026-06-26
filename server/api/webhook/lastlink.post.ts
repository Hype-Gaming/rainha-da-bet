import { getDb } from '../../utils/mongodb'

// O segredo vem do .env (LASTLINK_WEBHOOK_SECRET). Sem fallback hardcoded: se não
// estiver configurado, nenhum token bate e o webhook rejeita tudo (401).
const WEBHOOK_SECRET = process.env.LASTLINK_WEBHOOK_SECRET || ''

const ACTIVE_EVENTS = new Set([
  'paid',
  'active',
  'approved',
  'completed',
  'product_access_started',
  'purchase_approved',
  'purchase_completed',
  'subscription_started',
  'subscription_renewed'
])

const INACTIVE_EVENTS = new Set([
  'product_access_ended',
  'purchase_refused',
  'purchase_canceled',
  'purchase_refunded',
  'subscription_canceled',
  'subscription_expired',
  'chargeback'
])

const normalizeEvent = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()

const pickEmail = (body: any): string | undefined =>
  body?.Buyer?.Email
  || body?.buyer?.email
  || body?.Data?.Buyer?.Email
  || body?.data?.buyer?.email
  || body?.customer?.email
  || body?.Customer?.Email
  || body?.email
  || body?.Email

const pickEvent = (body: any): string =>
  body?.Event
  || body?.event
  || body?.EventType
  || body?.event_type
  || body?.status
  || body?.Status
  || ''

const pickProductName = (body: any): string | null =>
  body?.Data?.Products?.[0]?.Name
  || body?.data?.products?.[0]?.name
  || body?.Products?.[0]?.Name
  || body?.products?.[0]?.name
  || body?.Product?.Name
  || body?.product?.name
  || body?.plan?.name
  || null

const pickOrderId = (body: any): string | null =>
  body?.Data?.PurchaseId
  || body?.data?.purchaseId
  || body?.PurchaseId
  || body?.purchase_id
  || body?.order_id
  || body?.id
  || null

const pickName = (body: any): string | null =>
  body?.Buyer?.Name
  || body?.buyer?.name
  || body?.Data?.Buyer?.Name
  || body?.data?.buyer?.name
  || body?.customer?.name
  || body?.Customer?.Name
  || body?.name
  || body?.Name
  || null

const pickPhone = (body: any): string | null =>
  body?.Buyer?.PhoneNumber
  || body?.Buyer?.Phone
  || body?.buyer?.phoneNumber
  || body?.buyer?.phone
  || body?.Data?.Buyer?.PhoneNumber
  || body?.data?.buyer?.phone
  || body?.customer?.phone
  || body?.Customer?.PhoneNumber
  || body?.phone
  || body?.Phone
  || body?.telefone
  || null

export default defineEventHandler(async (event) => {
  // Validar token
  const token = getHeader(event, 'x-lastlink-token')
    || getQuery(event).token as string

  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const body = await readBody(event)
  console.log('[Lastlink Webhook] payload recebido:', JSON.stringify(body, null, 2))

  const email = pickEmail(body)
  const status = pickEvent(body)
  const normalizedStatus = normalizeEvent(status)

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email não encontrado no payload' })
  }

  const isActive = ACTIVE_EVENTS.has(normalizedStatus)
  const isInactive = INACTIVE_EVENTS.has(normalizedStatus)

  if (!isActive && !isInactive) {
    console.log(`[Lastlink Webhook] evento ignorado: ${status || 'sem status'}`)

    return {
      received: true,
      ignored: true,
      email: email.toLowerCase(),
      event: status || null
    }
  }

  const db = await getDb()
  const col = db.collection('subscriptions')

  const set: Record<string, unknown> = {
    email: email.toLowerCase(),
    status: isActive ? 'active' : 'inactive',
    role: isActive ? 'paid' : 'free',
    lastlink_status: status,
    lastlink_order_id: pickOrderId(body),
    product: pickProductName(body),
    updated_at: new Date()
  }

  // nome e telefone só são gravados quando vierem no payload (não apaga valor existente)
  const name = pickName(body)
  if (name) set.name = String(name).trim()
  const phone = pickPhone(body)
  if (phone) set.phone = String(phone).trim()

  await col.updateOne(
    { email: email.toLowerCase() },
    {
      $set: set,
      $setOnInsert: {
        created_at: new Date()
      }
    },
    { upsert: true }
  )

  console.log(`[Lastlink Webhook] ${email} → ${isActive ? 'ATIVO' : 'INATIVO'}`)

  return { received: true, email: email.toLowerCase(), status: isActive ? 'active' : 'inactive' }
})
