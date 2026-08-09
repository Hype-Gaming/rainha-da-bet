import { getDb } from '../../utils/mongodb'

// Remove a inscrição de push (quando o usuário desativa as notificações).
export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: string }>(event)
  const endpoint = body?.endpoint

  // Exige string de fato — sem isso, um objeto (ex.: `{ $ne: null }`) passaria
  // pela checagem de truthiness e viraria um operador do Mongo no filtro.
  if (!endpoint || typeof endpoint !== 'string') {
    throw createError({ statusCode: 400, message: 'endpoint é obrigatório.' })
  }

  const db = await getDb()
  await db.collection('push_subscriptions').deleteOne({ endpoint })

  return { ok: true }
})
