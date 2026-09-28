import { requireSession, routesAuthHeaders } from '../../../../utils/session'

interface VelvetTransaction {
  id: string
  status: string
  errorMessage?: string | null
}

// Mesma reducao que o velvet usa no ledger (src/ledger/outcome.ts).
const CONFIRMED = /complet|paid|approved|success|settled|done/i
const FAILED = /fail|cancel|expir|reject|refus|denied|error|revers/i

/**
 * O velvet nao expoe status por id: lista os depositos (a chamada tambem
 * sincroniza o banco dele) e acha o nosso.
 */
export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const transactionId = getRouterParam(event, 'transactionId')
  if (!transactionId) {
    throw createError({ statusCode: 400, statusMessage: 'transactionId é obrigatório' })
  }

  const config = useRuntimeConfig()
  const routesApi = config.public.routesApiBase as string

  const res = await $fetch<{ transactions?: VelvetTransaction[] }>(
    `${routesApi}/payments/deposits`,
    { query: { limit: '50' }, headers: routesAuthHeaders(session) },
  )

  const tx = res.transactions?.find((t) => t.id === transactionId)
  // Deposito recem-criado pode ainda nao aparecer na listagem; segue pendente
  // para o polling do front continuar em vez de marcar falha.
  if (!tx) return { success: true, status: 'pending', raw_status: null }

  const status = CONFIRMED.test(tx.status)
    ? 'completed'
    : FAILED.test(tx.status)
      ? 'failed'
      : 'pending'

  return { success: true, status, raw_status: tx.status, error: tx.errorMessage ?? null }
})
