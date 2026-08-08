import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@rainhadabet.com'

let configured = false

// Configura o web-push uma única vez (lazy). Sem as chaves VAPID no .env, o
// envio fica desabilitado e as rotas respondem com erro claro.
const ensureConfigured = (): boolean => {
  if (configured) return true
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[webpush] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes — push desabilitado.')
    return false
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
  return true
}

export const isPushConfigured = (): boolean => ensureConfigured()

export const getVapidPublicKey = (): string => VAPID_PUBLIC_KEY

// Ícone padrão das notificações. ATENÇÃO: /images/logo.png NÃO existe neste
// projeto — o logo fica em /logo.png, na raiz de public/.
export const DEFAULT_PUSH_ICON = '/logo.png'

export interface PushSubscriptionRecord {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

export interface SendResult {
  ok: boolean
  // status 404/410 = inscrição morta (deve ser removida do banco)
  gone: boolean
  statusCode?: number
}

// Envia uma notificação para UMA inscrição. Nunca lança: devolve o resultado
// para o chamador decidir (ex.: remover inscrições mortas).
export const sendToSubscription = async (
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<SendResult> => {
  if (!ensureConfigured()) return { ok: false, gone: false }

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    )
    return { ok: true, gone: false }
  } catch (err: any) {
    const statusCode = err?.statusCode
    const gone = statusCode === 404 || statusCode === 410
    if (!gone) {
      console.error('[webpush] Falha ao enviar push:', statusCode, err?.body || err?.message)
    }
    return { ok: false, gone, statusCode }
  }
}
