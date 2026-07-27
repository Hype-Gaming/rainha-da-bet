import { validateAdminCredentials, issueAdminToken } from '../../utils/admin'
import { getClientIp, rateLimit, resetRateLimit } from '../../utils/rateLimit'

/** Login do painel admin (independente do Cactus): e-mail + senha do .env. */
export default defineEventHandler(async (event) => {
  // Senha única, compartilhada e sem expiração: sem limite de tentativas, quebrar
  // por força bruta é só questão de tempo. 10 tentativas a cada 15 min inviabiliza
  // o ataque sem incomodar quem apenas errou a senha.
  const key = `admin-login:${getClientIp(event)}`
  rateLimit({
    key,
    limit: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Muitas tentativas de login. Aguarde alguns minutos.'
  })

  const body = await readBody(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')

  if (!validateAdminCredentials(email, password)) {
    throw createError({ statusCode: 401, message: 'E-mail ou senha inválidos' })
  }

  // Acertou: zera o contador para não punir quem errou antes.
  resetRateLimit(key)

  return { token: issueAdminToken(email), email }
})
