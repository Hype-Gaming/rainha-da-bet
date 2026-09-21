import { getDb } from '../../utils/mongodb'
import { normalizeMaintenanceSettings } from '../../utils/maintenance'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store, max-age=0')

  const db = await getDb()
  const doc = await db.collection('settings').findOne({ key: 'maintenance_mode' })

  return normalizeMaintenanceSettings(doc)
})
