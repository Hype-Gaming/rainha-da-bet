import { getUserSession } from '../../utils/session'

// Diz ao cliente se a sessão do servidor está viva, sem obrigá-lo a provocar um 401.
// Usado no boot do app para decidir se precisa refazer a troca de token.
export default defineEventHandler((event) => {
  const session = getUserSession(event)
  if (!session) return { authenticated: false }

  return { authenticated: true, email: session.email }
})
