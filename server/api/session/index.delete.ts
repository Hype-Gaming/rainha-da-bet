import { clearUserSession } from '../../utils/session'

export default defineEventHandler((event) => {
  clearUserSession(event)
  return { success: true }
})
