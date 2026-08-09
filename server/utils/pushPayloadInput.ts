import { DEFAULT_PUSH_ICON } from './webpush'

export interface PushPayloadInput {
  title?: string
  body?: string
  url?: string
  icon?: string
}

export interface ValidatedPushPayload {
  title: string
  body: string
  url: string
  icon: string
}

// Limites de tamanho: os serviços de push (FCM/APNs/Mozilla) recusam payloads
// acima de ~4KB. Estas margens ficam bem abaixo disso — e acima do que o painel
// admin deixa digitar (60/180) — então uma requisição legítima nunca esbarra aqui.
const MAX_TITLE_LENGTH = 120
const MAX_BODY_LENGTH = 500

// Valida e normaliza título/mensagem/url/icone de um payload de push.
// Usado tanto pelo envio imediato quanto pelo agendamento — regras idênticas.
export const validatePushPayloadInput = (body: PushPayloadInput | null | undefined): ValidatedPushPayload => {
  // Confere que título/mensagem são strings de fato — sem isso, um número,
  // array ou objeto passaria pela checagem de truthiness e o `.trim()` lançaria
  // um TypeError não tratado (500) em vez do 400 esperado.
  const rawTitle = body?.title
  const rawBody = body?.body
  if (typeof rawTitle !== 'string' || typeof rawBody !== 'string') {
    throw createError({ statusCode: 400, message: 'Título e mensagem são obrigatórios.' })
  }

  const title = rawTitle.trim()
  const message = rawBody.trim()

  if (!title || !message) {
    throw createError({ statusCode: 400, message: 'Título e mensagem são obrigatórios.' })
  }

  if (title.length > MAX_TITLE_LENGTH || message.length > MAX_BODY_LENGTH) {
    throw createError({ statusCode: 400, message: 'Título ou mensagem muito longos.' })
  }

  // `url` só é aceita como caminho relativo desta aplicação (começando com "/"
  // mas não "//", que é protocol-relative). Qualquer outra coisa — URL
  // absoluta, protocol-relative ou valor não-string — cai no fallback "/", sem
  // 400: é um campo opcional, então preferimos ser tolerantes a erro de digitação
  // do admin em vez de mandar o usuário para fora do site.
  const rawUrl = body?.url
  const trimmedUrl = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const url = trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//') ? trimmedUrl : '/'

  const rawIcon = body?.icon
  const icon = typeof rawIcon === 'string' && rawIcon.trim() ? rawIcon.trim() : DEFAULT_PUSH_ICON

  return { title, body: message, url, icon }
}
