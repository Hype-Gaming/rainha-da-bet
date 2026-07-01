// Resolve o link de suporte do WhatsApp a partir do valor cru salvo pelo admin.
// O valor pode ser um link completo (wa.me/message/..., https://...) OU só o número.

// Default usado quando o admin ainda não configurou nada.
export const DEFAULT_SUPPORT_HREF = 'https://wa.me/message/OH4WKRTTXBF2D1'

// Mensagem pré-preenchida usada apenas quando o valor é um número solto.
const PREFILL_MESSAGE = 'Oi, preciso desbloquear meu aplicativo'

/**
 * Converte o valor cru do admin no href final do WhatsApp.
 * - vazio → default
 * - link completo (http/https ou wa.me) → usado como está (sem mensagem pré-preenchida)
 * - só dígitos → monta https://wa.me/<digitos>?text=<mensagem>
 */
export const resolveSupportHref = (raw: string | null | undefined): string => {
  const value = String(raw || '').trim()
  if (!value) return DEFAULT_SUPPORT_HREF

  if (/^https?:\/\//i.test(value)) return value
  if (/^wa\.me\//i.test(value)) return `https://${value}`

  const digits = value.replace(/\D/g, '')
  if (!digits) return DEFAULT_SUPPORT_HREF

  return `https://wa.me/${digits}?text=${encodeURIComponent(PREFILL_MESSAGE)}`
}
