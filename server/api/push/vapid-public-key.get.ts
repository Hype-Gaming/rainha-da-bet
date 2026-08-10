import { getVapidPublicKey, isPushConfigured } from '../../utils/webpush'

// Expõe a chave pública VAPID para o cliente inscrever o navegador no push.
export default defineEventHandler(() => {
  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor.' })
  }
  return { publicKey: getVapidPublicKey() }
})
