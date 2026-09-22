import { getDb } from '../../utils/mongodb'
import { normalizeMaintenanceSettings, setMaintenanceNoCacheHeaders } from '../../utils/maintenance'

export default defineEventHandler(async (event) => {
  setMaintenanceNoCacheHeaders(event)

  const db = await getDb()
  const doc = await db.collection('settings').findOne({ key: 'maintenance_mode' })

  return normalizeMaintenanceSettings(doc)
})
