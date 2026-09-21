export interface MaintenanceSettings {
  enabled: boolean
  title: string
  message: string
  updatedAt: string | null
}

export const DEFAULT_MAINTENANCE_TITLE = 'Estamos em manutenção'
export const DEFAULT_MAINTENANCE_MESSAGE =
  'Estamos fazendo alguns ajustes para melhorar sua experiência. Voltaremos em breve.'

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
