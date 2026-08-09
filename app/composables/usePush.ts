// Composable de Web Push - Rainha da Bet
// Gerencia permissão, inscrição no Push e sincronização com o servidor.

// Converte a chave pública VAPID (base64url) para o Uint8Array exigido por
// pushManager.subscribe().
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Obtém um Service Worker ATIVO de forma robusta: registra /sw.js se ainda não
// houver registro e espera o worker ficar 'activated'. Substitui o
// `navigator.serviceWorker.ready`, que pode ficar pendente pra sempre se nenhum
// SW chegar a ativar (causa comum de "permiti mas nada acontece").
const getActiveRegistration = async (timeoutMs = 10000): Promise<ServiceWorkerRegistration> => {
  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js')
  }

  if (reg.active) return reg

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Service Worker não ativou a tempo.')), timeoutMs)
    const worker = reg!.installing || reg!.waiting
    if (!worker) {
      // sem worker instalando/esperando mas sem ativo: espera o ready como fallback
      navigator.serviceWorker.ready.then(() => { clearTimeout(timer); resolve() }).catch(reject)
      return
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        clearTimeout(timer)
        resolve()
      }
    })
  })

  return (await navigator.serviceWorker.getRegistration()) || reg
}

export const usePush = () => {
  // 'unsupported' | 'default' | 'granted' | 'denied'
  const permission = ref<'unsupported' | NotificationPermission>('default')
  const isSubscribed = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isSupported = (): boolean =>
    import.meta.client &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  // Lê o estado atual (permissão + se já existe inscrição ativa no SW) e
  // re-sincroniza com o servidor. Isso "auto-cura" o caso em que o navegador já
  // tem a inscrição mas o salvamento anterior falhou (ex.: servidor fora no
  // momento do clique): ao recarregar a página, a inscrição é re-enviada.
  const refresh = async (email?: string | null) => {
    if (!isSupported()) {
      permission.value = 'unsupported'
      return
    }
    permission.value = Notification.permission
    try {
      const registration = await getActiveRegistration()
      const sub = await registration.pushManager.getSubscription()
      isSubscribed.value = !!sub

      if (sub && permission.value === 'granted') {
        await $fetch('/api/push/subscribe', {
          method: 'POST',
          body: { subscription: sub.toJSON(), email: email ?? null }
        }).catch(() => {})
      }
    } catch {
      isSubscribed.value = false
    }
  }

  // Pede permissão, inscreve no Push e envia a inscrição ao servidor.
  // Retorna true se ficou inscrito.
  const subscribe = async (email?: string | null): Promise<boolean> => {
    error.value = null

    if (!isSupported()) {
      error.value = 'Seu navegador não suporta notificações.'
      permission.value = 'unsupported'
      return false
    }

    loading.value = true
    try {
      const result = await Notification.requestPermission()
      permission.value = result
      if (result !== 'granted') {
        error.value = result === 'denied'
          ? 'Permissão de notificações negada no navegador.'
          : 'Permissão não concedida.'
        return false
      }

      const { publicKey } = await $fetch<{ publicKey: string }>('/api/push/vapid-public-key')

      const registration = await getActiveRegistration()
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        })
      }

      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: { subscription: sub.toJSON(), email: email ?? null }
      })

      isSubscribed.value = true
      return true
    } catch (err: any) {
      console.error('[push] Erro ao inscrever:', err)
      // mensagem mais específica pra ajudar a diagnosticar
      const msg = String(err?.message || err)
      if (msg.includes('Service Worker')) {
        error.value = 'O Service Worker não ativou. Recarregue a página e tente de novo.'
      } else if (err?.name === 'NotAllowedError') {
        error.value = 'Permissão bloqueada no navegador.'
      } else {
        error.value = 'Não foi possível ativar. Verifique a conexão e tente de novo.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // Cancela a inscrição localmente e remove do servidor.
  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported()) return false
    loading.value = true
    try {
      const registration = await getActiveRegistration()
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await $fetch('/api/push/unsubscribe', {
          method: 'POST',
          body: { endpoint: sub.endpoint }
        }).catch(() => {})
        await sub.unsubscribe()
      }
      isSubscribed.value = false
      return true
    } catch (err) {
      console.error('[push] Erro ao cancelar inscrição:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    permission: readonly(permission),
    isSubscribed: readonly(isSubscribed),
    loading: readonly(loading),
    error: readonly(error),
    isSupported,
    refresh,
    subscribe,
    unsubscribe
  }
}
