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

const STATUS_UNAVAILABLE_TITLE = 'Estamos temporariamente indisponíveis'
const STATUS_UNAVAILABLE_MESSAGE =
  'Não foi possível verificar a disponibilidade do aplicativo. Tente novamente em instantes.'

export const useMaintenance = () => {
  const refreshMaintenance = async () => {
    if (maintenanceRequest) return maintenanceRequest

    maintenanceRequest = $fetch<MaintenanceSettings>('/api/settings/maintenance')
      .then((settings) => Object.assign(maintenanceState, settings))
      .catch(() => {
        // Sem um status confiável, não revelamos as telas de usuário. O painel
        // administrativo é liberado separadamente em app.vue.
        Object.assign(maintenanceState, {
          enabled: true,
          title: STATUS_UNAVAILABLE_TITLE,
          message: STATUS_UNAVAILABLE_MESSAGE,
          updatedAt: null
        })
      })
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
