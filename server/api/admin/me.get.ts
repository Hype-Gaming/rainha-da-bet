import { requireAdmin } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const email = await requireAdmin(event)
  return { admin: true, email }
})
