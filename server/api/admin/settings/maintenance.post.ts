import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  DEFAULT_MAINTENANCE_TITLE,
  MAX_MAINTENANCE_MESSAGE_LENGTH,
  MAX_MAINTENANCE_TITLE_LENGTH,
  setMaintenanceNoCacheHeaders,
  normalizeMaintenanceSettings
} from '../../../utils/maintenance'

export default defineEventHandler(async (event) => {
  setMaintenanceNoCacheHeaders(event)
  const adminEmail = await requireAdmin(event)
  const body = await readBody(event)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, message: 'Configuração de manutenção inválida.' })
  }

  if (typeof body.enabled !== 'boolean') {
    throw createError({ statusCode: 400, message: 'O status da manutenção é obrigatório.' })
  }

  if (body.title != null && typeof body.title !== 'string') {
    throw createError({ statusCode: 400, message: 'O título deve ser um texto.' })
  }

  if (body.message != null && typeof body.message !== 'string') {
    throw createError({ statusCode: 400, message: 'A mensagem deve ser um texto.' })
  }

  const title = (body.title || '').trim() || DEFAULT_MAINTENANCE_TITLE
  const message = (body.message || '').trim() || DEFAULT_MAINTENANCE_MESSAGE

  if (title.length > MAX_MAINTENANCE_TITLE_LENGTH) {
    throw createError({ statusCode: 400, message: `O título deve ter no máximo ${MAX_MAINTENANCE_TITLE_LENGTH} caracteres.` })
  }

  if (message.length > MAX_MAINTENANCE_MESSAGE_LENGTH) {
    throw createError({ statusCode: 400, message: `A mensagem deve ter no máximo ${MAX_MAINTENANCE_MESSAGE_LENGTH} caracteres.` })
  }

  const updatedAt = new Date()
  const db = await getDb()
  await db.collection('settings').updateOne(
    { key: 'maintenance_mode' },
    {
      $set: {
        key: 'maintenance_mode',
        enabled: body.enabled,
        title,
        message,
        updated_at: updatedAt,
        updated_by: adminEmail
      }
    },
    { upsert: true }
  )

  return normalizeMaintenanceSettings({ enabled: body.enabled, title, message, updated_at: updatedAt })
})
