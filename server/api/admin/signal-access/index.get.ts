import { requireAdmin } from '../../../utils/admin'
import { getSignalSettings } from '../../../utils/signalAccess'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  await requireAdmin(event)
  return getSignalSettings()
})
