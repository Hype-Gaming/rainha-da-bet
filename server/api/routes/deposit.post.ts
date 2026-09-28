import { requireSession, routesAuthHeaders } from '../../utils/session'

interface VelvetDeposit {
  transaction: { id: string; status: string; amount: string; currency: string }
  paymentPayload?: { type?: string; pix_payment?: string }
}

/**
 * Cria a cobrança PIX. O velvet devolve só o copia-e-cola em
 * `paymentPayload.pix_payment` — sem imagem de QR.
 */
export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody<{ amount?: string; currency?: string }>(event)
  const amount = String(body?.amount || '')
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw createError({ statusCode: 400, statusMessage: 'amount invalido' })
  }

  const config = useRuntimeConfig()
  const routesApi = config.public.routesApiBase as string

  const res = await $fetch<VelvetDeposit>(`${routesApi}/payments/deposit`, {
    method: 'POST',
    headers: routesAuthHeaders(session),
    body: { currency: body?.currency || 'BRL', amount, methodCode: 'PIX' },
  })

  const value = Number(res.transaction.amount)

  return {
    success: true,
    transaction_id: res.transaction.id,
    user_id: session.user.id,
    br_code: res.paymentPayload?.pix_payment || '',
    // O front antigo lia qr_code/payment_link; o velvet não devolve nenhum dos
    // dois, então vão vazios e a tela cai no copia-e-cola.
    qr_code: '',
    payment_link: '',
    status: res.transaction.status,
    value,
    amount: value,
    amount_cents: Math.round(value * 100),
  }
})
