import { requireAdmin } from '../../utils/admin'
import { loadHomeConfig } from '../../utils/homeConfig'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return loadHomeConfig()
})
