import { requireAdmin } from '../../../utils/admin'
import { setSubscriptionStatus } from '../../../utils/subscriptions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Liberação manual de acesso em lote: cola e-mails → upsert active em subscriptions
 * (mesmo formato do webhook). Para quando o webhook da Lastlink falha.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const raw = String(body?.emails || '')
  const emails = Array.from(
    new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))
  )

  if (!emails.length) {
    throw createError({ statusCode: 400, message: 'Nenhum e-mail informado' })
  }

  const results: Array<{ email: string; ok: boolean; error?: string }> = []
  for (const email of emails) {
    if (!EMAIL_RE.test(email)) {
      results.push({ email, ok: false, error: 'inválido' })
      continue
    }
    try {
      await setSubscriptionStatus(email, true)
      results.push({ email, ok: true })
    } catch {
      results.push({ email, ok: false, error: 'erro ao gravar' })
    }
  }

  return { results, approved: results.filter((r) => r.ok).length }
})
