import type { H3Event } from 'h3'

export interface MaintenanceSettings {
  enabled: boolean
  title: string
  message: string
  updatedAt: string | null
}

export const DEFAULT_MAINTENANCE_TITLE = 'Estamos em manutenção'
export const DEFAULT_MAINTENANCE_MESSAGE =
  'Estamos fazendo alguns ajustes para melhorar sua experiência. Voltaremos em breve.'
export const MAX_MAINTENANCE_TITLE_LENGTH = 100
export const MAX_MAINTENANCE_MESSAGE_LENGTH = 500

export const setMaintenanceNoCacheHeaders = (event: H3Event) => {
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  setHeader(event, 'Pragma', 'no-cache')
  setHeader(event, 'Expires', '0')
  setHeader(event, 'Surrogate-Control', 'no-store')
}

export const normalizeMaintenanceSettings = (doc: Record<string, any> | null): MaintenanceSettings => ({
  enabled: doc?.enabled === true,
  title: String(doc?.title || '').trim() || DEFAULT_MAINTENANCE_TITLE,
  message: String(doc?.message || '').trim() || DEFAULT_MAINTENANCE_MESSAGE,
  updatedAt: doc?.updated_at instanceof Date
    ? doc.updated_at.toISOString()
    : typeof doc?.updated_at === 'string'
      ? doc.updated_at
      : null
})
