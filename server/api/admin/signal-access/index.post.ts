import { requireAdmin } from '../../../utils/admin'
import { getDb } from '../../../utils/mongodb'
import { gameIds, normalizeEmail, parseMinimum } from '../../../utils/signalAccess'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const admin = await requireAdmin(event)
  const body = await readBody(event)
  if (!body || typeof body.minimums !== 'object' || !body.minimums || Array.isArray(body.minimums) || !Array.isArray(body.emails) || body.emails.length > 5000) {
    throw createError({ statusCode: 400, message: 'Configuração inválida.' })
  }
  const minimums: Record<string, number> = {}
  for (const id of gameIds) {
    const cents = parseMinimum(body.minimums[id])
    if (cents === null) throw createError({ statusCode: 400, message: `Valor inválido para ${id}. Use um valor não negativo com até duas casas decimais.` })
    minimums[id] = cents
  }
  if (body.emails.some((email: unknown) => typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    throw createError({ statusCode: 400, message: 'Lista de e-mails inválida.' })
  }
  const emails = [...new Set((body.emails as string[]).map(normalizeEmail))]
  const db = await getDb()
  await db.collection('settings').updateOne({ key: 'signal_access' }, { $set: { minimums, emails, updated_at: new Date(), updated_by: admin } }, { upsert: true })
  return { minimums, emails }
})
