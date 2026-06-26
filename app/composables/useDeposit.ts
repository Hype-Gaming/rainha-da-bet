// Composable de Depósito - Irmandade Club
// Integração com API Cactus para depósitos PIX

// Tipos
export interface DepositResponse {
  success: boolean
  transaction_id: string
  payment_link: string
  qr_code: string
  br_code: string
  value: number
  amount: number
  amount_cents: number
  user_id: number
}

export interface DepositState {
  isModalOpen: boolean
  step: 'amount' | 'payment' | 'success'
  amount: number
  depositData: DepositResponse | null
  loading: boolean
  error: string | null
}

// Estado global reativo
const depositState = reactive<DepositState>({
  isModalOpen: false,
  step: 'amount',
  amount: 0,
  depositData: null,
  loading: false,
  error: null
})

export const useDeposit = () => {
  const { token, cookieKey, fetchUserProfile, apiBaseUrl, brandSlug, baseDomain } = useAuth()

  // Abrir modal
  const openModal = () => {
    depositState.isModalOpen = true
    depositState.step = 'amount'
    depositState.amount = 0
    depositState.depositData = null
    depositState.error = null
  }

  // Fechar modal
  const closeModal = () => {
    depositState.isModalOpen = false
    depositState.step = 'amount'
    depositState.amount = 0
    depositState.depositData = null
    depositState.error = null
  }

  // Criar depósito
  const createDeposit = async (amount: number): Promise<{ success: boolean; message?: string }> => {
    if (!token.value || !cookieKey.value) {
      return { success: false, message: 'Usuário não autenticado' }
    }

    if (amount < 1) {
      return { success: false, message: 'Valor mínimo de depósito é R$ 1,00' }
    }

    depositState.loading = true
    depositState.error = null

    try {
      const response = await $fetch<DepositResponse>(`${apiBaseUrl.value}/api/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
          'X-Brand-Slug': brandSlug.value,
          'X-Base-Domain': baseDomain.value,
          'X-Cactus-Cookie-Key': cookieKey.value.toString()
        },
        body: {
          amount: String(amount)
        }
      })

      if (response.success) {
        depositState.depositData = response
        depositState.amount = amount
        depositState.step = 'payment'
        return { success: true }
      } else {
        return { success: false, message: 'Erro ao gerar depósito' }
      }
    } catch (err: any) {
      console.error('Erro ao criar depósito:', err)
      
      let message = 'Erro ao processar depósito. Tente novamente.'
      
      if (err?.data?.message) {
        message = err.data.message
      } else if (err?.data?.detail?.message) {
        message = err.data.detail.message
      }

      depositState.error = message
      return { success: false, message }
    } finally {
      depositState.loading = false
    }
  }

  // Copiar código PIX
  const copyPixCode = async (): Promise<boolean> => {
    if (!depositState.depositData?.br_code) return false

    try {
      await navigator.clipboard.writeText(depositState.depositData.br_code)
      return true
    } catch (err) {
      console.error('Erro ao copiar:', err)
      return false
    }
  }

  // Confirmar pagamento (atualiza saldo)
  const confirmPayment = async () => {
    depositState.step = 'success'
    // Atualiza o perfil para pegar o novo saldo
    await fetchUserProfile()
  }

  // Formatar valor para exibição
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return {
    // Estado
    isModalOpen: computed(() => depositState.isModalOpen),
    step: computed(() => depositState.step),
    amount: computed(() => depositState.amount),
    depositData: computed(() => depositState.depositData),
    loading: computed(() => depositState.loading),
    error: computed(() => depositState.error),

    // Métodos
    openModal,
    closeModal,
    createDeposit,
    copyPixCode,
    confirmPayment,
    formatAmount
  }
}
