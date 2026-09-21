export interface MaintenanceSettings {
  enabled: boolean
  title: string
  message: string
  updatedAt: string | null
}

const maintenanceState = reactive<MaintenanceSettings>({
  enabled: false,
  title: 'Estamos em manutenção',
  message: 'Estamos fazendo alguns ajustes para melhorar sua experiência. Voltaremos em breve.',
  updatedAt: null
})
const maintenanceReady = ref(false)
let maintenanceRequest: Promise<void> | null = null

export const useMaintenance = () => {
  const refreshMaintenance = async () => {
    if (maintenanceRequest) return maintenanceRequest

    maintenanceRequest = $fetch<MaintenanceSettings>('/api/settings/maintenance')
      .then((settings) => Object.assign(maintenanceState, settings))
      .catch(() => undefined)
      .finally(() => {
        maintenanceReady.value = true
        maintenanceRequest = null
      })

    return maintenanceRequest
  }

  return {
    maintenance: readonly(maintenanceState),
    maintenanceReady: readonly(maintenanceReady),
    refreshMaintenance
  }
}
