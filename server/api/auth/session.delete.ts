import { clearUserSession } from '../../utils/session'

// Encerra a sessão do NOSSO servidor. O logout do Cactus continua sendo feito
// pelo cliente (useAuth.logout) — este endpoint só apaga o cookie httpOnly, que
// o JavaScript não consegue remover sozinho.
export default defineEventHandler((event) => {
  clearUserSession(event)
  return { ok: true }
})
