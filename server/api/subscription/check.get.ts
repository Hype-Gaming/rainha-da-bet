import { requireUser } from '../../utils/session'
import { getSubscriptionState } from '../../utils/subscriptions'

/**
 * Estado de assinatura do usuário logado.
 *
 * ANTES: aceitava ?email=qualquer-um, sem autenticação — dava para enumerar a base
 * inteira e descobrir quem paga e quem está bloqueado. O parâmetro foi REMOVIDO:
 * o e-mail vem da sessão, então cada um só consulta a si mesmo.
 */
export default defineEventHandler(async (event) => {
  const session = requireUser(event)
  return await getSubscriptionState(session.email)
})
