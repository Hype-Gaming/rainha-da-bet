import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  DEFAULT_MAINTENANCE_TITLE,
  normalizeMaintenanceSettings
} from '../../../utils/maintenance'

export default defineEventHandler(async (event) => {
  const adminEmail = await requireAdmin(event)
  const body = await readBody(event)

  if (typeof body?.enabled !== 'boolean') {
    throw createError({ statusCode: 400, message: 'O status da manutenção é obrigatório.' })
  }

  const title = String(body?.title || '').trim() || DEFAULT_MAINTENANCE_TITLE
  const message = String(body?.message || '').trim() || DEFAULT_MAINTENANCE_MESSAGE

  if (title.length > 100 || message.length > 500) {
    throw createError({ statusCode: 400, message: 'Título ou mensagem excede o limite permitido.' })
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
