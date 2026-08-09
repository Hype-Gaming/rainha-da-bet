import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured } from '../../../utils/webpush'
import { dispatchToAllSubscriptions } from '../../../utils/pushDispatch'
import { validatePushPayloadInput, type PushPayloadInput } from '../../../utils/pushPayloadInput'

// Dispara uma notificação push, agora, para TODOS os navegadores inscritos.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor (VAPID ausente).' })
  }

  const body = await readBody<PushPayloadInput>(event)
  const payload = validatePushPayloadInput(body)

  return await dispatchToAllSubscriptions(payload)
})
