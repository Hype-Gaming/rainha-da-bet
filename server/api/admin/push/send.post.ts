import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured, DEFAULT_PUSH_ICON } from '../../../utils/webpush'
import { dispatchToAllSubscriptions } from '../../../utils/pushDispatch'

interface SendBody {
  title?: string
  body?: string
  url?: string
  icon?: string
}

// Dispara uma notificação push, agora, para TODOS os navegadores inscritos.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor (VAPID ausente).' })
  }

  const body = await readBody<SendBody>(event)
  const title = body?.title?.trim()
  const message = body?.body?.trim()

  if (!title || !message) {
    throw createError({ statusCode: 400, message: 'Título e mensagem são obrigatórios.' })
  }

  return await dispatchToAllSubscriptions({
    title,
    body: message,
    url: body?.url?.trim() || '/',
    icon: body?.icon?.trim() || DEFAULT_PUSH_ICON
  })
})
