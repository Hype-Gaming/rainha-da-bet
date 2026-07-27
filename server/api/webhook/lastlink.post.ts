import { getDb } from '../../utils/mongodb'
import { safeCompareSecret } from '../../utils/signing'

// O segredo vem do .env (LASTLINK_WEBHOOK_SECRET). Sem fallback hardcoded: se não
// estiver configurado, nenhum token bate e o webhook rejeita tudo (401).
//
// Lido dentro do handler (e não no topo do módulo) para não congelar o valor no
// momento do import — em build/prerender o .env pode ainda não estar carregado.
const getWebhookSecret = () => process.env.LASTLINK_WEBHOOK_SECRET || ''

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

/** Mascara o e-mail para o log: identifica o caso no suporte sem despejar PII. */
const maskEmail = (email: string): string => {
  const [user = '', domain = ''] = email.split('@')
  const head = user.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`
}

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

/**
 * Quando o evento ACONTECEU na Lastlink (não quando chegou aqui).
 *
 * É o dado que permite ignorar entregas fora de ordem. Se o payload não trouxer
 * data alguma, cai para "agora" — e nesse caso a ordenação degrada para a ordem
 * de chegada, que é o comportamento antigo.
 */
const pickEventAt = (body: any): Date => {
  const raw =
    body?.CreatedAt
    || body?.created_at
    || body?.Data?.CreatedAt
    || body?.data?.createdAt
    || body?.Data?.PurchaseDate
    || body?.data?.purchaseDate
    || body?.EventDate
    || body?.event_date
    || body?.Timestamp
    || body?.timestamp

  const parsed = raw ? new Date(raw) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
}

export default defineEventHandler(async (event) => {
  const secret = getWebhookSecret()

  // O token deve vir por HEADER. Por query (?token=...) ele vaza em texto puro no
  // log de acesso do nginx, no log do PM2 e em qualquer proxy do caminho.
  //
  // A query continua aceita por enquanto para não derrubar os pagamentos caso a
  // Lastlink ainda esteja configurada assim — mas grita no log. Depois de migrar
  // para o header, defina LASTLINK_ALLOW_QUERY_TOKEN=false e ROTACIONE o segredo
  // (o antigo já está registrado em log em algum lugar).
  const headerToken = String(getHeader(event, 'x-lastlink-token') || '')
  const queryTokenAllowed = process.env.LASTLINK_ALLOW_QUERY_TOKEN !== 'false'
  const queryToken = queryTokenAllowed ? String(getQuery(event).token || '') : ''

  if (queryToken && !headerToken) {
    console.warn(
      '[Lastlink Webhook] token recebido por query string (inseguro: fica no log). ' +
      'Configure a Lastlink para enviar o header x-lastlink-token.'
    )
  }

  const token = headerToken || queryToken

  if (!secret || !token || !safeCompareSecret(token, secret)) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const body = await readBody(event)

  // O payload traz nome, e-mail e telefone do comprador. Despejá-lo no log de
  // produção é vazamento de dado pessoal num arquivo que ninguém rotaciona.
  // Fica atrás de uma flag, para depuração pontual.
  if (process.env.LASTLINK_WEBHOOK_DEBUG === 'true') {
    console.log('[Lastlink Webhook] payload:', JSON.stringify(body))
  }

  const rawEmail = pickEmail(body)
  const status = pickEvent(body)
  const normalizedStatus = normalizeEvent(status)

  if (!rawEmail) {
    throw createError({ statusCode: 400, message: 'Email não encontrado no payload' })
  }

  const email = String(rawEmail).trim().toLowerCase()
  const isActive = ACTIVE_EVENTS.has(normalizedStatus)
  const isInactive = INACTIVE_EVENTS.has(normalizedStatus)

  if (!isActive && !isInactive) {
    console.log(`[Lastlink Webhook] evento ignorado: ${status || 'sem status'}`)

    return {
      received: true,
      ignored: true,
      email,
      event: status || null
    }
  }

  const eventAt = pickEventAt(body)
  const db = await getDb()
  const col = db.collection('subscriptions')

  // ORDENAÇÃO: webhooks reentregam e chegam fora de ordem por design. Sem esta
  // guarda, um "cancelado" de terça que chega depois do "renovado" de quarta
  // desativa um assinante que está em dia.
  //
  // Feito em duas etapas (ler, comparar, escrever). A janela de corrida entre elas
  // é desprezível: só afetaria dois eventos do MESMO e-mail processados no mesmo
  // instante, e o pior caso é reaplicar um estado que já estava correto.
  const current = await col.findOne({ email }, { projection: { event_at: 1 } })
  const currentEventAt = current?.event_at ? new Date(current.event_at) : null

  if (currentEventAt && currentEventAt > eventAt) {
    console.log(
      `[Lastlink Webhook] ${maskEmail(email)} → evento antigo descartado ` +
      `(${eventAt.toISOString()} < ${currentEventAt.toISOString()})`
    )
    return { received: true, stale: true, email, status: normalizedStatus }
  }

  const set: Record<string, unknown> = {
    email,
    status: isActive ? 'active' : 'inactive',
    role: isActive ? 'paid' : 'free',
    lastlink_status: status,
    lastlink_order_id: pickOrderId(body),
    product: pickProductName(body),
    event_at: eventAt,
    updated_at: new Date()
  }

  // nome e telefone só são gravados quando vierem no payload (não apaga valor existente)
  const name = pickName(body)
  if (name) set.name = String(name).trim()
  const phone = pickPhone(body)
  if (phone) set.phone = String(phone).trim()

  await col.updateOne(
    { email },
    {
      $set: set,
      $setOnInsert: {
        created_at: new Date()
      }
    },
    { upsert: true }
  )

  console.log(`[Lastlink Webhook] ${maskEmail(email)} → ${isActive ? 'ATIVO' : 'INATIVO'}`)

  return { received: true, email, status: isActive ? 'active' : 'inactive' }
})
