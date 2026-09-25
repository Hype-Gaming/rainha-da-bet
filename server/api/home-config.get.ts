import { loadHomeConfig } from '../utils/homeConfig'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return loadHomeConfig()
})
