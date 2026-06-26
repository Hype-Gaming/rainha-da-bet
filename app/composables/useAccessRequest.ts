// Composable para solicitar liberação de acesso (fila do painel admin).
// Usado quando a verificação de assinatura falha.

export const useAccessRequest = () => {
  const sending = ref(false)
  const sent = ref(false)
  const error = ref('')

  const requestAccess = async (
    email: string,
    name?: string | null,
    phone?: string | null
  ): Promise<boolean> => {
    if (!email) {
      error.value = 'Email inválido'
      return false
    }

    sending.value = true
    error.value = ''

    try {
      await $fetch('/api/access-request', {
        method: 'POST',
        body: { email, name: name ?? null, phone: phone ?? null }
      })
      sent.value = true
      return true
    } catch {
      error.value = 'Não foi possível enviar o pedido. Tente novamente.'
      return false
    } finally {
      sending.value = false
    }
  }

  return {
    sending: readonly(sending),
    sent: readonly(sent),
    error: readonly(error),
    requestAccess
  }
}
