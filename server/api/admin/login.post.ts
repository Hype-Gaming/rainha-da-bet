import { validateAdminCredentials, issueAdminToken } from '../../utils/admin'

/** Login do painel admin (independente do Cactus): e-mail + senha do .env. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')

  if (!validateAdminCredentials(email, password)) {
    throw createError({ statusCode: 401, message: 'E-mail ou senha inválidos' })
  }

  return { token: issueAdminToken(email), email }
})
