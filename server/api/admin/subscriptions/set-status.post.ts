import { requireAdmin } from '../../../utils/admin'
import { setSubscriptionStatus } from '../../../utils/subscriptions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const status = String(body?.status || '')

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email obrigatório' })
  }
  if (status !== 'active' && status !== 'inactive') {
    throw createError({ statusCode: 400, message: 'Status inválido' })
  }

  await setSubscriptionStatus(email, status === 'active')

  return { ok: true, email, status }
})
