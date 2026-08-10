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
    // 'statechange' dispara várias vezes até chegar num estado terminal
    // (installing -> installed -> activating -> activated, ou -> redundant),
    // então não dá pra usar { once: true } direto: removemos o listener nós
    // mesmos assim que um estado terminal é alcançado, pra não deixá-lo
    // pendurado pelo resto da vida da página.
    const onStateChange = () => {
      if (worker.state === 'activated') {
        clearTimeout(timer)
        worker.removeEventListener('statechange', onStateChange)
        resolve()
      } else if (worker.state === 'redundant') {
        // Estado terminal: o worker falhou ao instalar ou foi substituído.
        // Rejeita na hora em vez de esperar o timeout todo.
        clearTimeout(timer)
        worker.removeEventListener('statechange', onStateChange)
        reject(new Error('O Service Worker falhou ao instalar.'))
      }
    }
    worker.addEventListener('statechange', onStateChange)
  })

  return (await navigator.serviceWorker.getRegistration()) || reg
}

// Estado compartilhado em nível de módulo (mesmo padrão de useAdmin/useAuth/
// useSubscription): todo componente que chamar usePush() enxerga o mesmo
// estado, em vez de cada chamada ter sua própria cópia desincronizada.
// 'unsupported' | 'default' | 'granted' | 'denied'
const permission = ref<'unsupported' | NotificationPermission>('default')
const isSubscribed = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
// Fica true depois que o primeiro refresh() termina no cliente. Enquanto
// false, o estado acima ainda é só o valor inicial (não o real), então a UI
// não deve decidir nada com base nele.
const checked = ref(false)

export const usePush = () => {
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
    // Estado do módulo é compartilhado entre requisições no processo do Nitro:
    // nunca escrever nele durante SSR, senão o estado de um usuário vaza pro
    // render de outro. No servidor, simplesmente não há nada a fazer aqui. O
    // guard retorna ANTES do try/finally, então 'checked' nunca é escrito no
    // servidor.
    if (!import.meta.client) return

    // Limpa erro de uma tentativa anterior: um refresh novo (ex.: ao voltar
    // pra página) não deve reexibir um erro antigo sem o usuário ter clicado
    // em nada de novo.
    error.value = null

    if (!isSupported()) {
      permission.value = 'unsupported'
      checked.value = true
      return
    }

    try {
      permission.value = Notification.permission
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
    } finally {
      checked.value = true
    }
  }

  // Pede permissão, inscreve no Push e envia a inscrição ao servidor.
  // Retorna true se ficou inscrito.
  const subscribe = async (email?: string | null): Promise<boolean> => {
    // Estado do módulo é compartilhado entre requisições no processo do Nitro:
    // nunca escrever nele durante SSR, senão o estado de um usuário vaza pro
    // render de outro. No servidor, não há permissão/push pra pedir mesmo.
    if (!import.meta.client) return false

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
      // status do erro do $fetch/ofetch vem em formatos diferentes conforme a
      // origem (erro de rede vs. resposta HTTP), então checamos várias formas.
      const statusCode = err?.statusCode ?? err?.status ?? err?.response?.status
      if (msg.includes('Service Worker')) {
        error.value = 'O Service Worker não ativou. Recarregue a página e tente de novo.'
      } else if (err?.name === 'NotAllowedError') {
        error.value = 'Permissão bloqueada no navegador.'
      } else if (statusCode === 503) {
        // VAPID não configurado no servidor: não adianta o usuário tentar de novo.
        error.value = 'Notificações indisponíveis no momento. Tente mais tarde.'
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
    checked: readonly(checked),
    isSupported,
    refresh,
    subscribe,
    unsubscribe
  }
}
