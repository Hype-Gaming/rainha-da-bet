# Notificações Push — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar para o rainha-da-bet o sistema de notificações push do clube_BB — usuário ativa no navegador, admin dispara na hora ou agendado (uma vez / todo dia) para todos os inscritos.

**Architecture:** Web Push nativo com VAPID. Três camadas com limites claros: `webpush.ts` envia para **uma** inscrição e nunca lança; `pushDispatch.ts` percorre todas em lotes e limpa as mortas; endpoints só validam e delegam; um plugin Nitro decide *quando* e delega o *como*. Estado em duas collections MongoDB (`push_subscriptions`, `scheduled_notifications`).

**Tech Stack:** Nuxt 4 (Nitro), TypeScript, MongoDB (driver oficial), `web-push`, Service Worker em `public/sw.js`.

**Spec:** `docs/superpowers/specs/2026-08-08-notificacoes-push-design.md`

---

## Convenções deste repositório (leia antes de começar)

- **Arquivos `.ts` (server, composables):** indentação de 2 espaços, **sem** ponto e vírgula, aspas simples. Veja `server/utils/admin.ts`.
- **Arquivos `.vue` (pages, components):** indentação de 4 espaços, **com** ponto e vírgula, aspas duplas. Veja `app/pages/admin/webhook.vue`.
- **Imports no server:** explícitos e relativos (`import { getDb } from '../../utils/mongodb'`), nunca auto-import. Veja `server/api/admin/stats.get.ts:1-3`.
- **Auth admin:** `await requireAdmin(event)` de `server/utils/admin.ts`. É **async** e retorna o e-mail. No cliente, use `adminFetch` do composable `useAdmin` — nunca `$fetch` direto em rota `/api/admin/*`.
- **Ícones:** componente `<Icon name="ph:..." />` (`@nuxt/icon` + `@iconify-json/ph`).
- **Não existe suite de testes no projeto.** A verificação de cada task é feita por checagem estática (`node --check`, build) e por checagem manual no navegador. Cada task diz exatamente qual comando rodar e qual saída esperar.

## Estrutura de arquivos

**Criar (14):**

| Arquivo | Responsabilidade única |
|---|---|
| `server/utils/webpush.ts` | Configurar VAPID e enviar para **uma** inscrição |
| `server/utils/pushDispatch.ts` | Enviar para todas as inscrições em lotes e remover as mortas |
| `server/plugins/notification-scheduler.ts` | Disparar agendamentos vencidos a cada 60s |
| `server/api/push/vapid-public-key.get.ts` | Expor a chave pública VAPID |
| `server/api/push/subscribe.post.ts` | Gravar/atualizar uma inscrição |
| `server/api/push/unsubscribe.post.ts` | Remover uma inscrição |
| `server/api/admin/push/send.post.ts` | Envio imediato para todos |
| `server/api/admin/push/stats.get.ts` | Contadores para o painel |
| `server/api/admin/push/subscriptions.get.ts` | Lista de inscritos enriquecida |
| `server/api/admin/push/scheduled.get.ts` | Listar agendamentos |
| `server/api/admin/push/scheduled.post.ts` | Criar agendamento |
| `server/api/admin/push/scheduled/[id].delete.ts` | Cancelar agendamento |
| `app/composables/usePush.ts` | Permissão, inscrição e sincronização no cliente |
| `app/pages/admin/push.vue` | Painel de notificações |

**Modificar (7):** `package.json`, `.env.example`, `public/sw.js`, `public/manifest.json`, `app/pages/index.vue`, `app/pages/auth/login.vue`, `app/pages/admin/index.vue`.

Dois arquivos a mais do que o spec previa, ambos justificados: `public/manifest.json` (os ícones apontam para um caminho inexistente, e sem manifest válido a PWA não instala — o que desliga o push no iOS) e `app/pages/admin/index.vue` (link de navegação para o painel novo).

---

### Task 1: Dependência e chaves VAPID

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env` (não versionado)

- [ ] **Step 1: Instalar a dependência**

```bash
npm install web-push
npm install -D @types/web-push
```

- [ ] **Step 2: Verificar que instalou**

Run: `node -e "console.log(require('web-push/package.json').version)"`
Expected: imprime uma versão (ex.: `3.6.7`), sem erro de módulo não encontrado.

- [ ] **Step 3: Gerar o par de chaves VAPID**

```bash
npx web-push generate-vapid-keys
```

Saída esperada: um bloco com `Public Key:` e `Private Key:` (strings base64url longas). **Guarde as duas** — a privada nunca vai para o git.

- [ ] **Step 4: Documentar as variáveis em `.env.example`**

Acrescente ao final de `.env.example`:

```bash
# Notificacoes push (Web Push / VAPID).
# Gere o par com: npx web-push generate-vapid-keys
# Sem essas duas chaves o push fica DESATIVADO (endpoints respondem 503).
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
# Contato exigido pelo protocolo VAPID. Precisa ser mailto: ou https://
VAPID_SUBJECT=mailto:contato@rainhadabet.com
```

- [ ] **Step 5: Preencher o `.env` local**

Acrescente ao `.env` (arquivo real, não versionado) as mesmas três chaves, agora com os valores gerados no Step 3.

Nota: `ecosystem.config.cjs` já injeta **todas** as chaves do `.env` no processo PM2 (veja a função `loadEnv`), então nada precisa ser duplicado lá.

- [ ] **Step 6: Confirmar que o `.env` não vai para o git**

Run: `git check-ignore -v .env`
Expected: imprime a linha do `.gitignore` que ignora o `.env`. Se **não** imprimir nada, pare e adicione `.env` ao `.gitignore` antes de continuar.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(push): adiciona web-push e variaveis VAPID"
```

---

### Task 2: `webpush.ts` — envio para uma inscrição

**Files:**
- Create: `server/utils/webpush.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@rainhadabet.com'

let configured = false

// Configura o web-push uma única vez (lazy). Sem as chaves VAPID no .env, o
// envio fica desabilitado e as rotas respondem com erro claro.
const ensureConfigured = (): boolean => {
  if (configured) return true
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[webpush] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes — push desabilitado.')
    return false
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
  return true
}

export const isPushConfigured = (): boolean => ensureConfigured()

export const getVapidPublicKey = (): string => VAPID_PUBLIC_KEY

// Ícone padrão das notificações. ATENÇÃO: /images/logo.png NÃO existe neste
// projeto — o logo fica em /logo.png, na raiz de public/.
export const DEFAULT_PUSH_ICON = '/logo.png'

export interface PushSubscriptionRecord {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

export interface SendResult {
  ok: boolean
  // status 404/410 = inscrição morta (deve ser removida do banco)
  gone: boolean
  statusCode?: number
}

// Envia uma notificação para UMA inscrição. Nunca lança: devolve o resultado
// para o chamador decidir (ex.: remover inscrições mortas).
export const sendToSubscription = async (
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<SendResult> => {
  if (!ensureConfigured()) return { ok: false, gone: false }

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    )
    return { ok: true, gone: false }
  } catch (err: any) {
    const statusCode = err?.statusCode
    const gone = statusCode === 404 || statusCode === 410
    if (!gone) {
      console.error('[webpush] Falha ao enviar push:', statusCode, err?.body || err?.message)
    }
    return { ok: false, gone, statusCode }
  }
}
```

- [ ] **Step 2: Verificar que o TypeScript aceita o arquivo**

Run: `npx tsc --noEmit --skipLibCheck --esModuleInterop --moduleResolution bundler --module esnext --target es2022 server/utils/webpush.ts`
Expected: nenhuma saída (sucesso). Se acusar `Cannot find module 'web-push'`, a Task 1 não foi concluída.

- [ ] **Step 3: Commit**

```bash
git add server/utils/webpush.ts
git commit -m "feat(push): util de envio VAPID para uma inscricao"
```

---

### Task 3: `pushDispatch.ts` — envio em lote

**Files:**
- Create: `server/utils/pushDispatch.ts`

Diferença deliberada em relação ao clube_BB: lá o envio é um `Promise.all` sobre **todas** as inscrições de uma vez. Aqui o envio é feito em lotes de 50 (paralelo dentro do lote, sequencial entre lotes), para não abrir centenas de conexões simultâneas com os push services conforme a base cresce. O resultado agregado é idêntico.

- [ ] **Step 1: Criar o arquivo**

```ts
import { getDb } from './mongodb'
import { sendToSubscription, type PushPayload, type PushSubscriptionRecord } from './webpush'

// Quantas inscrições são enviadas em paralelo por vez. Evita abrir centenas de
// conexões simultâneas com os push services quando a base cresce.
const BATCH_SIZE = 50

export interface DispatchResult {
  sent: number
  failed: number
  removed: number
  total: number
}

// Envia uma notificação para TODAS as inscrições de push e remove em lote as
// que estiverem mortas (404/410). Reutilizado pelo envio manual (admin) e pelo
// scheduler de notificações agendadas.
export const dispatchToAllSubscriptions = async (payload: PushPayload): Promise<DispatchResult> => {
  const db = await getDb()
  const collection = db.collection('push_subscriptions')
  const subs = await collection.find({}).toArray()

  if (subs.length === 0) {
    return { sent: 0, failed: 0, removed: 0, total: 0 }
  }

  const results: Array<{ endpoint: string; ok: boolean; gone: boolean }> = []

  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const batch = subs.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((s) =>
        sendToSubscription(s as unknown as PushSubscriptionRecord, payload)
          .then((r) => ({ endpoint: s.endpoint as string, ok: r.ok, gone: r.gone }))
      )
    )
    results.push(...batchResults)
  }

  const goneEndpoints = results.filter((r) => r.gone).map((r) => r.endpoint)
  if (goneEndpoints.length > 0) {
    await collection.deleteMany({ endpoint: { $in: goneEndpoints } })
  }

  const sent = results.filter((r) => r.ok).length

  return {
    sent,
    failed: results.length - sent,
    removed: goneEndpoints.length,
    total: results.length
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit --skipLibCheck --esModuleInterop --moduleResolution bundler --module esnext --target es2022 server/utils/pushDispatch.ts`
Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add server/utils/pushDispatch.ts
git commit -m "feat(push): dispatch em lote com limpeza de inscricoes mortas"
```

---

### Task 4: Endpoints públicos de inscrição

**Files:**
- Create: `server/api/push/vapid-public-key.get.ts`
- Create: `server/api/push/subscribe.post.ts`
- Create: `server/api/push/unsubscribe.post.ts`

- [ ] **Step 1: Criar `server/api/push/vapid-public-key.get.ts`**

```ts
import { getVapidPublicKey, isPushConfigured } from '../../utils/webpush'

// Expõe a chave pública VAPID para o cliente inscrever o navegador no push.
export default defineEventHandler(() => {
  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor.' })
  }
  return { publicKey: getVapidPublicKey() }
})
```

- [ ] **Step 2: Criar `server/api/push/subscribe.post.ts`**

O índice único em `endpoint` é criado aqui, na primeira chamada, e ignorado nas seguintes — o projeto não tem sistema de migração.

```ts
import { getDb } from '../../utils/mongodb'

interface SubscribeBody {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  email?: string | null
}

let indexEnsured = false

// Garante o índice único em `endpoint` uma vez por processo. Falha de índice
// nunca deve derrubar a inscrição do usuário, então o erro é só logado.
const ensureIndex = async (db: Awaited<ReturnType<typeof getDb>>): Promise<void> => {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await db.collection('push_subscriptions').createIndex({ endpoint: 1 }, { unique: true })
  } catch (err) {
    console.error('[push] Falha ao criar índice de push_subscriptions:', err)
  }
}

// Salva (ou atualiza) a inscrição de push do navegador na collection
// `push_subscriptions`, chaveada pelo endpoint (único por navegador/dispositivo).
export default defineEventHandler(async (event) => {
  const body = await readBody<SubscribeBody>(event)
  const sub = body?.subscription

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw createError({ statusCode: 400, message: 'Inscrição de push inválida.' })
  }

  const db = await getDb()
  await ensureIndex(db)

  const now = new Date()
  const email = body.email?.trim().toLowerCase() || null

  await db.collection('push_subscriptions').updateOne(
    { endpoint: sub.endpoint },
    {
      $set: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        email,
        updated_at: now
      },
      $setOnInsert: { created_at: now }
    },
    { upsert: true }
  )

  return { ok: true }
})
```

- [ ] **Step 3: Criar `server/api/push/unsubscribe.post.ts`**

```ts
import { getDb } from '../../utils/mongodb'

// Remove a inscrição de push (quando o usuário desativa as notificações).
export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: string }>(event)
  const endpoint = body?.endpoint

  if (!endpoint) {
    throw createError({ statusCode: 400, message: 'endpoint é obrigatório.' })
  }

  const db = await getDb()
  await db.collection('push_subscriptions').deleteOne({ endpoint })

  return { ok: true }
})
```

- [ ] **Step 4: Subir o dev server e testar os três endpoints**

Em um terminal: `npm run dev` (deixe rodando).

Em outro terminal:

```bash
curl -s http://localhost:3098/api/push/vapid-public-key
```
Expected: `{"publicKey":"B..."}` — a mesma chave pública do `.env`. Se vier 503, as chaves não estão no `.env`.

```bash
curl -s -X POST http://localhost:3098/api/push/subscribe -H "Content-Type: application/json" -d "{}"
```
Expected: erro 400 com a mensagem `Inscrição de push inválida.`

```bash
curl -s -X POST http://localhost:3098/api/push/subscribe -H "Content-Type: application/json" -d "{\"subscription\":{\"endpoint\":\"https://exemplo.test/fake-1\",\"keys\":{\"p256dh\":\"aaa\",\"auth\":\"bbb\"}},\"email\":\"Teste@Exemplo.com\"}"
```
Expected: `{"ok":true}`. O documento fica em `push_subscriptions` com `email` em minúsculas (`teste@exemplo.com`).

```bash
curl -s -X POST http://localhost:3098/api/push/unsubscribe -H "Content-Type: application/json" -d "{\"endpoint\":\"https://exemplo.test/fake-1\"}"
```
Expected: `{"ok":true}` e o documento sumiu da collection.

- [ ] **Step 5: Commit**

```bash
git add server/api/push
git commit -m "feat(push): endpoints de inscricao e chave publica VAPID"
```

---

### Task 5: Service Worker e manifest

**Files:**
- Modify: `public/sw.js`
- Modify: `public/manifest.json`

**Por que esta task é bloqueante:** o `urlsToCache` atual lista `/images/logo.png`, que **não existe** neste projeto (`public/` tem `logo.png` na raiz e não tem diretório `images/`). Como `cache.addAll` rejeita por inteiro se qualquer URL falhar, o evento `install` falha e o Service Worker nunca ativa. Sem SW ativo não existe push.

- [ ] **Step 1: Corrigir o `CACHE_NAME` e o `urlsToCache`**

Em `public/sw.js`, substitua as linhas 1-10 por:

```js
const CACHE_NAME = 'rainha-da-bet-v2';
const VERSION_URL = '/version.json';
const CHECK_INTERVAL = 30000; // Verificar a cada 30 segundos

// ATENÇÃO: todas as URLs aqui precisam existir de verdade. cache.addAll()
// rejeita por inteiro se QUALQUER uma falhar, o install quebra e o Service
// Worker nunca ativa — o que desliga o push junto.
const urlsToCache = [
  '/',
  '/auth/login',
  '/logo.png',
  '/robots.txt'
];
```

- [ ] **Step 2: Substituir o handler de `push`**

Em `public/sw.js`, substitua todo o bloco que começa em `// Push notification event` e termina antes de `// Notification click event` por:

```js
// Push notification event
self.addEventListener('push', (event) => {
  // Payload enviado pelo servidor como JSON: { title, body, url, icon }.
  // Mantém compatibilidade com texto cru e com push sem payload.
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Rainha da Bet';
  const options = {
    body: data.body || 'Você tem uma nova notificação!',
    icon: data.icon || '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
```

- [ ] **Step 3: Substituir o handler de `notificationclick`**

Substitua todo o bloco `// Notification click event` (até o fim do arquivo) por:

```js
// Notification click event - foca uma aba aberta ou abre a URL do payload
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
```

- [ ] **Step 4: Corrigir os ícones do `public/manifest.json`**

Troque as **quatro** ocorrências de `"/images/logo.png"` por `"/logo.png"` (duas em `icons`, uma em `shortcuts[0].icons`, e confira se não há outra). Não mexa em `name`/`short_name` nesta task.

Motivo: ícone quebrado impede a instalação da PWA, e no iOS o push **só** funciona com a PWA instalada.

- [ ] **Step 5: Verificar sintaxe dos dois arquivos**

Run: `node --check public/sw.js`
Expected: nenhuma saída.

Run: `node -e "const m=require('./public/manifest.json'); const s=JSON.stringify(m); if(s.includes('/images/')){console.error('AINDA HA /images/ no manifest'); process.exit(1);} console.log('manifest ok');"`
Expected: `manifest ok`.

Run: `node -e "const s=require('fs').readFileSync('public/sw.js','utf8'); if(s.includes('/images/')){console.error('AINDA HA /images/ no sw.js'); process.exit(1);} console.log('sw ok');"`
Expected: `sw ok`.

- [ ] **Step 6: Verificar no navegador que o Service Worker ATIVA**

Com `npm run dev` rodando, abra `http://localhost:3098` e vá em DevTools → Application → Service Workers.

Expected: o worker aparece com status **activated and is running**. Se aparecer `redundant` ou ficar preso em `installing`, o `urlsToCache` ainda tem alguma URL que dá 404 — confira o Console por `Failed to execute 'addAll' on 'Cache'`.

Se você já tinha aberto o site antes, clique em **Unregister**, recarregue e confira de novo.

- [ ] **Step 7: Commit**

```bash
git add public/sw.js public/manifest.json
git commit -m "fix(sw): corrige urlsToCache quebrado e trata payload JSON no push"
```

---

### Task 6: Composable `usePush`

**Files:**
- Create: `app/composables/usePush.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
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
```

- [ ] **Step 2: Verificar que o dev server compila**

Com `npm run dev` rodando, o Nuxt recarrega sozinho.
Expected: nenhum erro no terminal do dev server. O composable ainda não é usado por ninguém, então não há mudança visível.

- [ ] **Step 3: Commit**

```bash
git add app/composables/usePush.ts
git commit -m "feat(push): composable usePush com auto-cura da inscricao"
```

---

### Task 7: Card "Ativar notificações" na home

**Files:**
- Modify: `app/pages/index.vue`

**Atenção ao conflito de nomes:** `index.vue` já usa `isSubscribed` de `useSubscription()` (linha ~380). O `isSubscribed` do `usePush` **precisa** ser renomeado no destructuring, senão a assinatura do usuário quebra.

- [ ] **Step 1: Adicionar o estado do push ao `<script setup>`**

Em `app/pages/index.vue`, logo **antes** do bloco `// Atualizar balance e verificar assinatura ao montar a página` (linha ~401), insira:

```ts
// Notificações push (web push)
const {
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    loading: pushLoading,
    error: pushError,
    refresh: refreshPush,
    subscribe: subscribePush,
} = usePush();

// Botão de ativar: aparece quando a permissão permite pedir (default/granted) e
// ainda não está inscrito.
const showPushPrompt = computed(
    () =>
        (pushPermission.value === "default" ||
            pushPermission.value === "granted") &&
        !pushSubscribed.value,
);

// Permissão bloqueada de vez pelo navegador: mostra instruções de desbloqueio.
const pushBlocked = computed(() => pushPermission.value === "denied");

const handleEnablePush = async () => {
    await subscribePush(user.value?.email || null);
};
```

- [ ] **Step 2: Chamar `refreshPush` no `onMounted` existente**

No `onMounted` da linha ~402, acrescente uma linha depois de `refreshSubscriptionAccess();`:

```ts
    refreshPush(user.value?.email || null);
```

O bloco final fica assim:

```ts
onMounted(() => {
    if (isAuthenticated.value) {
        fetchUserProfile();
    }
    refreshSubscriptionAccess();
    refreshPush(user.value?.email || null);

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handleWindowFocus);
});
```

- [ ] **Step 3: Adicionar o card ao template**

Em `app/pages/index.vue`, logo **depois** do `</div>` que fecha `<div class="news-card featured">` (linha ~79) e **antes** do `<NuxtLink ... class="news-item"`, insira:

```html
                <!-- Ativar notificações push (default/granted e ainda não inscrito) -->
                <button
                    v-if="showPushPrompt"
                    class="push-prompt"
                    :disabled="pushLoading"
                    @click="handleEnablePush"
                >
                    <div class="push-prompt-icon">
                        <Icon
                            :name="
                                pushLoading
                                    ? 'ph:spinner-bold'
                                    : 'ph:bell-ringing-bold'
                            "
                            :class="{ spin: pushLoading }"
                        />
                    </div>
                    <div class="push-prompt-text">
                        <strong>Ativar notificações</strong>
                        <span v-if="pushError" class="push-prompt-error">{{
                            pushError
                        }}</span>
                        <span v-else>Receba avisos e sinais em primeira mão</span>
                    </div>
                </button>

                <!-- Permissão bloqueada: explica como desbloquear -->
                <div v-else-if="pushBlocked" class="push-prompt push-blocked">
                    <div class="push-prompt-icon">
                        <Icon name="ph:bell-slash-bold" />
                    </div>
                    <div class="push-prompt-text">
                        <strong>Notificações bloqueadas</strong>
                        <span
                            >Toque no 🔒 ao lado do endereço → Notificações →
                            Permitir, e recarregue a página.</span
                        >
                    </div>
                </div>
```

- [ ] **Step 4: Adicionar o CSS no `<style scoped>` da página**

No fim do bloco `<style scoped>` de `index.vue`:

```css
.push-prompt {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 14px;
    margin-bottom: 12px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1a0410 0%, #2a0818 100%);
    border: 1px solid rgba(251, 101, 166, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
}

.push-prompt:hover:not(:disabled) {
    border-color: #fb65a6;
    box-shadow: 0 0 16px rgba(251, 101, 166, 0.2);
}

.push-prompt:disabled {
    opacity: 0.7;
    cursor: default;
}

.push-prompt.push-blocked {
    cursor: default;
    border-color: rgba(255, 93, 108, 0.4);
}

.push-prompt-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 10px;
    background: rgba(251, 101, 166, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #fb65a6;
}

.push-prompt-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.push-prompt-text strong {
    font-size: 14px;
    color: #fff;
}

.push-prompt-text span {
    font-size: 12.5px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
}

.push-prompt-error {
    color: #ff5d6c !important;
}

.push-prompt-icon .spin {
    animation: spin 1s linear infinite;
}
```

Nota: `@keyframes spin` já está definido em `app.html` como estilo global — não redeclare.

- [ ] **Step 5: Verificar no navegador**

Com `npm run dev` rodando, abra `http://localhost:3098` numa aba anônima.

Expected:
- O card "Ativar notificações" aparece na sidebar de notícias.
- Clicar abre o prompt nativo do navegador.
- Ao permitir, o card **some** e um documento novo aparece em `push_subscriptions` com o e-mail do usuário logado (ou `null` se deslogado).
- A assinatura do usuário continua funcionando normalmente (prova que o rename de `isSubscribed` está certo).

- [ ] **Step 6: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat(push): card de ativar notificacoes na home"
```

---

### Task 8: Card "Ativar notificações" no login

**Files:**
- Modify: `app/pages/auth/login.vue`

**Atenção ao conflito de nomes:** `login.vue` já usa `loading` de `useAuth()` (linha 106). O `loading` do `usePush` **precisa** ser renomeado.

- [ ] **Step 1: Adicionar o estado do push ao `<script setup>`**

Em `app/pages/auth/login.vue`, logo **depois** de `const form = reactive({...});` (linha ~114), insira:

```ts
// Notificações push (web push)
const {
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    loading: pushLoading,
    error: pushError,
    refresh: refreshPush,
    subscribe: subscribePush,
} = usePush();

const showPushPrompt = computed(
    () =>
        (pushPermission.value === "default" ||
            pushPermission.value === "granted") &&
        !pushSubscribed.value,
);

const handleEnablePush = async () => {
    await subscribePush(null);
};
```

- [ ] **Step 2: Chamar `refreshPush` no `onMounted` existente**

O `onMounted` da linha ~117 fica assim:

```ts
// Redirecionar se já estiver autenticado
onMounted(() => {
    if (isAuthenticated.value) {
        navigateTo("/");
        return;
    }
    refreshPush(null);
});
```

- [ ] **Step 3: Adicionar o card ao template**

Em `app/pages/auth/login.vue`, logo **depois** do `</div>` que fecha `<div class="login-footer">` (linha ~92) e **antes** do `</div>` seguinte, insira:

```html
            <!-- Ativar notificações push -->
            <button
                v-if="showPushPrompt"
                class="push-prompt"
                :disabled="pushLoading"
                @click="handleEnablePush"
            >
                <Icon
                    :name="
                        pushLoading ? 'ph:spinner' : 'ph:bell-ringing-bold'
                    "
                    :class="{ spinner: pushLoading }"
                />
                <span v-if="pushError">{{ pushError }}</span>
                <span v-else>Ativar notificações de sinais</span>
            </button>
```

- [ ] **Step 4: Adicionar o CSS no `<style scoped>` da página**

```css
.push-prompt {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    width: 100%;
    margin-top: 18px;
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(251, 101, 166, 0.08);
    border: 1px solid rgba(251, 101, 166, 0.35);
    color: #fb65a6;
    font-size: 13.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
}

.push-prompt:hover:not(:disabled) {
    background: rgba(251, 101, 166, 0.14);
    border-color: #fb65a6;
}

.push-prompt:disabled {
    opacity: 0.6;
    cursor: default;
}
```

Nota: a classe `.spinner` (com a animação) já existe no `<style scoped>` do `login.vue`, usada pelo botão de entrar — reaproveitada aqui.

- [ ] **Step 5: Verificar no navegador**

Abra `http://localhost:3098/auth/login` numa aba anônima (deslogado).

Expected: o botão aparece abaixo dos links de criar conta; clicar pede permissão; ao permitir, o botão some e a inscrição é gravada com `email: null`. O login normal continua funcionando (prova que o rename de `loading` está certo).

- [ ] **Step 6: Commit**

```bash
git add app/pages/auth/login.vue
git commit -m "feat(push): botao de ativar notificacoes no login"
```

---

### Task 9: Endpoints admin de envio e leitura

**Files:**
- Create: `server/api/admin/push/send.post.ts`
- Create: `server/api/admin/push/stats.get.ts`
- Create: `server/api/admin/push/subscriptions.get.ts`

- [ ] **Step 1: Criar `server/api/admin/push/send.post.ts`**

```ts
import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured, DEFAULT_PUSH_ICON } from '../../../utils/webpush'
import { dispatchToAllSubscriptions } from '../../../utils/pushDispatch'

interface SendBody {
  title?: string
  body?: string
  url?: string
  icon?: string
}

// Dispara uma notificação push, agora, para TODOS os navegadores inscritos.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor (VAPID ausente).' })
  }

  const body = await readBody<SendBody>(event)
  const title = body?.title?.trim()
  const message = body?.body?.trim()

  if (!title || !message) {
    throw createError({ statusCode: 400, message: 'Título e mensagem são obrigatórios.' })
  }

  return await dispatchToAllSubscriptions({
    title,
    body: message,
    url: body?.url?.trim() || '/',
    icon: body?.icon?.trim() || DEFAULT_PUSH_ICON
  })
})
```

- [ ] **Step 2: Criar `server/api/admin/push/stats.get.ts`**

```ts
import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured } from '../../../utils/webpush'

// Resumo para o painel: quantos navegadores estão inscritos no push.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const collection = db.collection('push_subscriptions')

  const [total, withEmail] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ email: { $ne: null } })
  ])

  return {
    configured: isPushConfigured(),
    total,
    withEmail
  }
})
```

- [ ] **Step 3: Criar `server/api/admin/push/subscriptions.get.ts`**

```ts
import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'

// Lista os dispositivos inscritos (sem expor as chaves de criptografia),
// enriquecidos com os dados do usuário (nome/telefone) via app_users.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const docs = await db
    .collection('push_subscriptions')
    .aggregate([
      { $sort: { updated_at: -1 } },
      { $limit: 200 },
      {
        $lookup: {
          from: 'app_users',
          localField: 'email',
          foreignField: 'email',
          as: '_user'
        }
      },
      { $addFields: { user: { $arrayElemAt: ['$_user', 0] } } }
    ])
    .toArray()

  return docs.map((d) => {
    let provider = 'desconhecido'
    try {
      provider = new URL(d.endpoint as string).hostname
    } catch {
      // ignora endpoints malformados
    }
    return {
      id: d._id.toString(),
      email: d.email || null,
      name: d.user?.name || null,
      phone: d.user?.phone || null,
      provider,
      createdAt: d.created_at || null,
      updatedAt: d.updated_at || null,
      lastSeenAt: d.user?.last_seen_at || null
    }
  })
})
```

- [ ] **Step 4: Verificar que exigem autenticação**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3098/api/admin/push/stats
```
Expected: `401`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3098/api/admin/push/send -H "Content-Type: application/json" -d "{\"title\":\"x\",\"body\":\"y\"}"
```
Expected: `401`.

- [ ] **Step 5: Commit**

```bash
git add server/api/admin/push/send.post.ts server/api/admin/push/stats.get.ts server/api/admin/push/subscriptions.get.ts
git commit -m "feat(push): endpoints admin de envio, stats e inscritos"
```

---

### Task 10: Endpoints admin de agendamento

**Files:**
- Create: `server/api/admin/push/scheduled.get.ts`
- Create: `server/api/admin/push/scheduled.post.ts`
- Create: `server/api/admin/push/scheduled/[id].delete.ts`

- [ ] **Step 1: Criar `server/api/admin/push/scheduled.get.ts`**

```ts
import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'

// Lista os agendamentos: todos os ativos + os últimos finalizados/cancelados.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const docs = await db
    .collection('scheduled_notifications')
    .find({})
    .sort({ status: 1, nextRunAt: 1, createdAt: -1 })
    .limit(50)
    .toArray()

  return docs.map((d) => ({
    id: d._id.toString(),
    title: d.title,
    body: d.body,
    url: d.url,
    type: d.type,
    time: d.time,
    nextRunAt: d.nextRunAt,
    status: d.status,
    lastSentAt: d.lastSentAt,
    lastResult: d.lastResult
  }))
})
```

- [ ] **Step 2: Criar `server/api/admin/push/scheduled.post.ts`**

O índice de busca do scheduler é criado aqui, na primeira chamada.

```ts
import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'
import { isPushConfigured, DEFAULT_PUSH_ICON } from '../../../utils/webpush'

interface ScheduleBody {
  title?: string
  body?: string
  url?: string
  type?: 'once' | 'daily'
  // Momento do primeiro disparo (ISO). O cliente calcula a partir do fuso local.
  runAt?: string
  // Rótulo HH:mm (usado por 'daily' e para exibição). Opcional.
  time?: string
}

let indexEnsured = false

// Índice usado pelo scheduler para achar os jobs vencidos. Falha de índice não
// deve impedir o agendamento, então o erro é só logado.
const ensureIndex = async (db: Awaited<ReturnType<typeof getDb>>): Promise<void> => {
  if (indexEnsured) return
  indexEnsured = true
  try {
    await db.collection('scheduled_notifications').createIndex({ status: 1, nextRunAt: 1 })
  } catch (err) {
    console.error('[push] Falha ao criar índice de scheduled_notifications:', err)
  }
}

// Cria uma notificação agendada (uma vez ou diária) na collection
// `scheduled_notifications`. O disparo é feito pelo scheduler do servidor.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (!isPushConfigured()) {
    throw createError({ statusCode: 503, message: 'Push não configurado no servidor (VAPID ausente).' })
  }

  const body = await readBody<ScheduleBody>(event)
  const title = body?.title?.trim()
  const message = body?.body?.trim()
  const type = body?.type === 'daily' ? 'daily' : 'once'

  if (!title || !message) {
    throw createError({ statusCode: 400, message: 'Título e mensagem são obrigatórios.' })
  }

  const runAt = body?.runAt ? new Date(body.runAt) : null
  if (!runAt || isNaN(runAt.getTime())) {
    throw createError({ statusCode: 400, message: 'Data/horário do agendamento inválido.' })
  }

  // Para envio único, não deixa agendar no passado (tolerância de 1 min).
  if (type === 'once' && runAt.getTime() < Date.now() - 60_000) {
    throw createError({ statusCode: 400, message: 'O horário escolhido já passou.' })
  }

  const db = await getDb()
  await ensureIndex(db)

  const now = new Date()

  const doc = {
    title,
    body: message,
    url: body?.url?.trim() || '/',
    icon: DEFAULT_PUSH_ICON,
    type,
    time: body?.time?.trim() || null,
    nextRunAt: runAt,
    status: 'active' as const,
    createdAt: now,
    lastSentAt: null as Date | null,
    lastResult: null as unknown
  }

  const result = await db.collection('scheduled_notifications').insertOne(doc)

  return { ok: true, id: result.insertedId.toString() }
})
```

- [ ] **Step 3: Criar `server/api/admin/push/scheduled/[id].delete.ts`**

```ts
import { ObjectId } from 'mongodb'
import { getDb } from '../../../../utils/mongodb'
import { requireAdmin } from '../../../../utils/admin'

// Cancela (remove) um agendamento pelo id.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id || !ObjectId.isValid(id)) {
    throw createError({ statusCode: 400, message: 'Id de agendamento inválido.' })
  }

  const db = await getDb()
  const result = await db.collection('scheduled_notifications').deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, message: 'Agendamento não encontrado.' })
  }

  return { ok: true }
})
```

- [ ] **Step 4: Verificar que exigem autenticação**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3098/api/admin/push/scheduled
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3098/api/admin/push/scheduled/000000000000000000000000
```
Expected: `401` nas duas.

- [ ] **Step 5: Commit**

```bash
git add server/api/admin/push/scheduled.get.ts server/api/admin/push/scheduled.post.ts server/api/admin/push/scheduled
git commit -m "feat(push): endpoints admin de agendamento"
```

---

### Task 11: Scheduler no servidor

**Files:**
- Create: `server/plugins/notification-scheduler.ts`

Este é o primeiro plugin Nitro do projeto — o diretório `server/plugins/` ainda não existe e precisa ser criado.

- [ ] **Step 1: Criar o arquivo**

```ts
import { getDb } from '../utils/mongodb'
import { isPushConfigured, DEFAULT_PUSH_ICON } from '../utils/webpush'
import { dispatchToAllSubscriptions } from '../utils/pushDispatch'

const TICK_MS = 60_000

// Avança uma data em N dias mantendo o mesmo horário (Brasil não tem DST desde
// 2019, então somar dias preserva a hora local).
const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Plugin do Nitro: inicia um agendador em memória que, a cada minuto, dispara as
// notificações agendadas que já venceram. Reagenda as diárias e finaliza as
// únicas. Usa claim atômico (status 'sending') para não disparar em duplicidade.
export default defineNitroPlugin(() => {
  // evita múltiplos intervalos em hot-reload (dev)
  const g = globalThis as any
  if (g.__notificationSchedulerStarted) return
  g.__notificationSchedulerStarted = true

  let ticking = false

  const tick = async () => {
    if (ticking) return
    ticking = true
    try {
      if (!isPushConfigured()) return

      const db = await getDb()
      const collection = db.collection('scheduled_notifications')
      const now = new Date()

      // pega os vencidos um a um, com claim atômico
      while (true) {
        const job = await collection.findOneAndUpdate(
          { status: 'active', nextRunAt: { $lte: now } },
          { $set: { status: 'sending' } },
          { sort: { nextRunAt: 1 }, returnDocument: 'after' }
        )
        if (!job) break

        let result
        try {
          result = await dispatchToAllSubscriptions({
            title: job.title,
            body: job.body,
            url: job.url || '/',
            icon: job.icon || DEFAULT_PUSH_ICON
          })
        } catch (err) {
          console.error('[scheduler] Falha ao disparar agendamento:', err)
          result = { error: true }
        }

        if (job.type === 'daily') {
          // reagenda para a próxima ocorrência futura do mesmo horário
          let next = addDays(job.nextRunAt as Date, 1)
          const tNow = new Date()
          while (next.getTime() <= tNow.getTime()) {
            next = addDays(next, 1)
          }
          await collection.updateOne(
            { _id: job._id },
            { $set: { status: 'active', nextRunAt: next, lastSentAt: new Date(), lastResult: result } }
          )
        } else {
          await collection.updateOne(
            { _id: job._id },
            { $set: { status: 'done', lastSentAt: new Date(), lastResult: result } }
          )
        }

        console.log(`[scheduler] Agendamento "${job.title}" disparado:`, result)
      }
    } catch (err) {
      console.error('[scheduler] Erro no tick:', err)
    } finally {
      ticking = false
    }
  }

  // primeira execução logo após o boot (pega agendamentos vencidos enquanto o
  // servidor estava fora), depois a cada minuto.
  setTimeout(tick, 5_000)
  setInterval(tick, TICK_MS)

  console.log('[scheduler] Agendador de notificações iniciado.')
})
```

- [ ] **Step 2: Reiniciar o dev server e confirmar que o plugin carregou**

Pare o `npm run dev` (Ctrl+C) e rode de novo.

Expected: aparece no terminal a linha `[scheduler] Agendador de notificações iniciado.` durante o boot. Se não aparecer, o Nitro não encontrou o plugin — confira que o caminho é exatamente `server/plugins/notification-scheduler.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/plugins/notification-scheduler.ts
git commit -m "feat(push): agendador de notificacoes no servidor"
```

---

### Task 12: Página `/admin/push`

**Files:**
- Create: `app/pages/admin/push.vue`

Modelada em `app/pages/admin/webhook.vue`: mesmo `AdminPasswordGate`, mesmo `definePageMeta({ middleware: "admin" })`, mesmo vocabulário de classes `adm-*`.

- [ ] **Step 1: Criar o template**

```html
<template>
    <AdminPasswordGate v-if="needsLogin" @authed="loadAll" />

    <div class="adm-page adm-scroll">
        <div class="adm-aurora"></div>
        <div class="adm-wrap">
            <header class="adm-topbar adm-fade-up">
                <div class="adm-logo">
                    <Icon name="ph:bell-ringing-bold" class="adm-logo-icon" />
                    <span>Notificações — Rainha da Bet</span>
                </div>
                <div class="adm-topbar-right">
                    <NuxtLink to="/admin" class="adm-btn-ghost">
                        <Icon name="ph:arrow-left-bold" /> Dashboard
                    </NuxtLink>
                </div>
            </header>

            <!-- Aviso de push não configurado -->
            <section v-if="stats && !stats.configured" class="adm-panel adm-fade-up">
                <p class="adm-hint adm-warn">
                    <Icon name="ph:warning-bold" />
                    Push desativado: faltam VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
                    no .env do servidor.
                </p>
            </section>

            <!-- Compor -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:paper-plane-tilt-bold" /> Nova notificação</h2>
                    <span v-if="stats" class="adm-muted-txt small">
                        {{ stats.total }} dispositivo(s) inscrito(s)
                    </span>
                </div>

                <div class="adm-field">
                    <label for="title">Título</label>
                    <input
                        id="title"
                        v-model="title"
                        type="text"
                        maxlength="60"
                        class="adm-input"
                        placeholder="Ex: Sinal liberado! 🚀"
                    />
                </div>

                <div class="adm-field">
                    <label for="message">Mensagem</label>
                    <textarea
                        id="message"
                        v-model="message"
                        rows="3"
                        maxlength="180"
                        class="adm-textarea"
                        placeholder="Ex: Nova entrada disponível no Bac Bo. Abra o app agora!"
                    ></textarea>
                </div>

                <div class="adm-field">
                    <label for="url">Link ao clicar (opcional)</label>
                    <input
                        id="url"
                        v-model="url"
                        type="text"
                        class="adm-input"
                        placeholder="/  (padrão: abre o app na home)"
                    />
                </div>

                <div class="adm-field">
                    <label>Quando enviar</label>
                    <div class="adm-radios">
                        <label
                            ><input v-model="mode" type="radio" value="now" />
                            Agora</label
                        >
                        <label
                            ><input v-model="mode" type="radio" value="once" />
                            Uma vez, em</label
                        >
                        <label
                            ><input v-model="mode" type="radio" value="daily" />
                            Todo dia às</label
                        >
                    </div>
                </div>

                <div v-if="mode === 'once'" class="adm-field">
                    <label for="datetime">Data e horário</label>
                    <input
                        id="datetime"
                        v-model="datetime"
                        type="datetime-local"
                        class="adm-input"
                    />
                </div>

                <div v-if="mode === 'daily'" class="adm-field">
                    <label for="time">Horário (todo dia)</label>
                    <input id="time" v-model="timeOfDay" type="time" class="adm-input" />
                </div>

                <button
                    class="adm-btn-primary"
                    :disabled="sending || !title.trim() || !message.trim()"
                    @click="submit"
                >
                    <Icon name="ph:paper-plane-tilt-bold" />
                    {{ submitLabel }}
                </button>

                <p v-if="lastResult" class="adm-hint">
                    Enviadas: <strong>{{ lastResult.sent }}</strong> · Falhas:
                    <strong>{{ lastResult.failed }}</strong> · Inscrições
                    removidas: <strong>{{ lastResult.removed }}</strong>
                </p>
            </section>

            <!-- Agendamentos -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2><Icon name="ph:calendar-check-bold" /> Agendamentos</h2>
                    <button class="adm-btn-ghost" :disabled="loading" @click="loadAll">
                        <Icon name="ph:arrow-clockwise-bold" /> Atualizar
                    </button>
                </div>

                <p v-if="!scheduled.length" class="adm-hint">
                    Nenhum agendamento.
                </p>

                <ul v-else class="adm-req-list">
                    <li v-for="job in scheduled" :key="job.id" class="adm-req">
                        <div class="adm-req-info">
                            <strong>{{ job.title }}</strong>
                            <span class="adm-muted-txt">{{ job.body }}</span>
                            <span class="adm-muted-txt small">
                                {{ job.type === "daily" ? "Todo dia" : "Uma vez" }}
                                · próximo: {{ fmtDate(job.nextRunAt) }} ·
                                {{ job.status }}
                            </span>
                        </div>
                        <div class="adm-req-actions">
                            <button
                                class="adm-btn-reject"
                                :disabled="busy === job.id"
                                @click="cancelJob(job.id)"
                            >
                                <Icon name="ph:trash-bold" /> Cancelar
                            </button>
                        </div>
                    </li>
                </ul>
            </section>

            <!-- Inscritos -->
            <section class="adm-panel adm-fade-up">
                <div class="adm-panel-head">
                    <h2>
                        <Icon name="ph:devices-bold" /> Inscritos ({{
                            subscribers.length
                        }})
                    </h2>
                </div>

                <p v-if="!subscribers.length" class="adm-hint">
                    Ninguém ativou as notificações ainda.
                </p>

                <ul v-else class="adm-req-list">
                    <li v-for="s in subscribers" :key="s.id" class="adm-req">
                        <div class="adm-req-info">
                            <strong>{{ s.name || s.email || "Anônimo" }}</strong>
                            <span v-if="s.email" class="adm-muted-txt">{{ s.email }}</span>
                            <span class="adm-muted-txt small">
                                {{ s.provider }} · desde {{ fmtDate(s.createdAt) }}
                            </span>
                        </div>
                    </li>
                </ul>
            </section>
        </div>

        <Teleport to="body">
            <div v-if="toast" class="adm-toast" :class="toastType">{{ toast }}</div>
        </Teleport>
    </div>
</template>
```

- [ ] **Step 2: Criar o `<script setup>`**

```html
<script setup lang="ts">
definePageMeta({ middleware: "admin" });

interface PushStats {
    configured: boolean;
    total: number;
    withEmail: number;
}

interface DispatchResult {
    sent: number;
    failed: number;
    removed: number;
    total: number;
}

interface ScheduledJob {
    id: string;
    title: string;
    body: string;
    url: string;
    type: "once" | "daily";
    time: string | null;
    nextRunAt: string | null;
    status: string;
    lastSentAt: string | null;
}

interface Subscriber {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    provider: string;
    createdAt: string | null;
    updatedAt: string | null;
}

// needsLogin é um computed do useAdmin — NÃO declare um ref local para ele.
const { adminFetch, needsLogin } = useAdmin();

const loading = ref(false);
const sending = ref(false);
const busy = ref<string | null>(null);

const title = ref("");
const message = ref("");
const url = ref("");
const mode = ref<"now" | "once" | "daily">("now");
const datetime = ref("");
const timeOfDay = ref("");

const stats = ref<PushStats | null>(null);
const scheduled = ref<ScheduledJob[]>([]);
const subscribers = ref<Subscriber[]>([]);
const lastResult = ref<DispatchResult | null>(null);

const toast = ref("");
const toastType = ref<"ok" | "error">("ok");

const submitLabel = computed(() => {
    if (sending.value) return "Enviando...";
    if (mode.value === "now") return "Enviar agora";
    return "Agendar";
});

const showToast = (msg: string, type: "ok" | "error" = "ok") => {
    toast.value = msg;
    toastType.value = type;
    setTimeout(() => (toast.value = ""), 3500);
};

const fmtDate = (value: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

// Monta o momento do primeiro disparo em ISO, a partir do fuso local do admin.
// 'once' usa o datetime-local direto; 'daily' usa o próximo horário futuro.
const buildRunAt = (): string | null => {
    if (mode.value === "once") {
        if (!datetime.value) return null;
        const d = new Date(datetime.value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    if (!timeOfDay.value) return null;
    const [h, m] = timeOfDay.value.split(":").map(Number);
    if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return null;

    const next = new Date();
    next.setSeconds(0, 0);
    next.setHours(h, m);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return next.toISOString();
};

const loadAll = async () => {
    loading.value = true;
    try {
        const [s, j, subs] = await Promise.all([
            adminFetch<PushStats>("/api/admin/push/stats"),
            adminFetch<ScheduledJob[]>("/api/admin/push/scheduled"),
            adminFetch<Subscriber[]>("/api/admin/push/subscriptions"),
        ]);
        stats.value = s;
        scheduled.value = j;
        subscribers.value = subs;
    } catch (err: any) {
        // O adminFetch já derruba a sessão no 401, o que faz needsLogin virar
        // true sozinho e o AdminPasswordGate aparecer.
        const status = err?.status || err?.statusCode;
        if (status !== 401) {
            showToast("Falha ao carregar os dados.", "error");
        }
    } finally {
        loading.value = false;
    }
};

const submit = async () => {
    sending.value = true;
    lastResult.value = null;
    try {
        if (mode.value === "now") {
            const res = await adminFetch<DispatchResult>("/api/admin/push/send", {
                method: "POST",
                body: {
                    title: title.value,
                    body: message.value,
                    url: url.value,
                },
            });
            lastResult.value = res;
            showToast(`Enviada para ${res.sent} dispositivo(s).`);
        } else {
            const runAt = buildRunAt();
            if (!runAt) {
                showToast("Informe a data/horário do agendamento.", "error");
                return;
            }
            await adminFetch("/api/admin/push/scheduled", {
                method: "POST",
                body: {
                    title: title.value,
                    body: message.value,
                    url: url.value,
                    type: mode.value,
                    runAt,
                    time: mode.value === "daily" ? timeOfDay.value : null,
                },
            });
            showToast("Agendamento criado.");
        }

        title.value = "";
        message.value = "";
        url.value = "";
        await loadAll();
    } catch (err: any) {
        showToast(err?.data?.message || "Falha ao enviar.", "error");
    } finally {
        sending.value = false;
    }
};

const cancelJob = async (id: string) => {
    busy.value = id;
    try {
        await adminFetch(`/api/admin/push/scheduled/${id}`, { method: "DELETE" });
        showToast("Agendamento cancelado.");
        await loadAll();
    } catch {
        showToast("Falha ao cancelar.", "error");
    } finally {
        busy.value = null;
    }
};

onMounted(() => {
    if (!needsLogin.value) loadAll();
});

useHead({ title: "Notificações - Admin" });
</script>
```

- [ ] **Step 3: Criar os estilos**

```html
<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.adm-page { min-height: 100vh; background: var(--adm-bg); color: var(--adm-text); position: relative; font-family: "Manrope", sans-serif; }
.adm-wrap { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 24px 28px 80px; display: flex; flex-direction: column; gap: 22px; }
.adm-topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin: -24px -28px 4px; padding: 18px 28px; background: rgba(7, 9, 15, 0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--adm-border-soft); }
.adm-logo { display: flex; align-items: center; gap: 11px; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
.adm-logo span { background: linear-gradient(92deg, #fff 30%, #ffc2de 75%, var(--adm-accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.adm-logo-icon { font-size: 22px; color: #fff; background: var(--adm-grad-accent); border-radius: 10px; padding: 7px; box-shadow: 0 6px 18px rgba(251, 101, 166, 0.35); }
@media (max-width: 560px) { .adm-topbar { margin: -24px -28px 4px; padding: 14px 18px; } }
.adm-btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: var(--adm-panel); border: 1px solid var(--adm-border); color: var(--adm-muted); border-radius: 9px; padding: 8px 13px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s var(--adm-ease); }
.adm-btn-ghost:hover:not(:disabled) { border-color: var(--adm-accent); color: var(--adm-accent); }
.adm-panel { background: var(--adm-panel); border: 1px solid var(--adm-border-soft); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 14px; }
.adm-panel-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.adm-panel-head h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
.adm-panel-head h2 :deep(svg) { color: var(--adm-accent); }
.adm-hint { color: var(--adm-muted); font-size: 13.5px; margin: 0; line-height: 1.5; }
.adm-warn { display: flex; align-items: center; gap: 8px; color: var(--adm-red); }
.adm-field { display: flex; flex-direction: column; gap: 6px; }
.adm-field label { font-size: 13px; font-weight: 600; color: var(--adm-muted); }
.adm-input, .adm-textarea { background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft); border-radius: 10px; color: var(--adm-text); padding: 12px 14px; font-size: 14px; outline: none; font-family: inherit; }
.adm-textarea { resize: vertical; }
.adm-input:focus, .adm-textarea:focus { border-color: var(--adm-accent); }
.adm-radios { display: flex; flex-wrap: wrap; gap: 16px; }
.adm-radios label { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 500; color: var(--adm-text); cursor: pointer; }
.adm-btn-primary { align-self: flex-start; display: inline-flex; align-items: center; gap: 7px; background: var(--adm-accent); color: #1a0410; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
.adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-req-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.adm-req { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--adm-bg-2); border: 1px solid var(--adm-border-soft); border-radius: 10px; padding: 14px; flex-wrap: wrap; }
.adm-req-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.adm-req-info strong { font-size: 14px; word-break: break-all; }
.adm-muted-txt { color: var(--adm-muted); font-size: 13px; word-break: break-word; }
.adm-muted-txt.small { font-size: 12px; }
.adm-req-actions { display: flex; gap: 8px; }
.adm-btn-reject { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--adm-red); color: #2a0608; }
.adm-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 10px; font-size: 14px; z-index: 10000; }
.adm-toast.ok { background: rgba(45, 212, 167, 0.15); border: 1px solid var(--adm-green); color: var(--adm-green); }
.adm-toast.error { background: rgba(255, 93, 108, 0.15); border: 1px solid var(--adm-red); color: var(--adm-red); }
</style>
```

- [ ] **Step 4: Verificar no navegador**

Abra `http://localhost:3098/admin/push` e faça login como admin.

Expected:
- A página carrega com os três painéis (nova notificação, agendamentos, inscritos).
- O contador de dispositivos inscritos bate com o número de documentos em `push_subscriptions`.
- Se as chaves VAPID estiverem no `.env`, **não** aparece o aviso vermelho.

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/push.vue
git commit -m "feat(push): painel admin de notificacoes"
```

---

### Task 13: Link para o painel de notificações

**Files:**
- Modify: `app/pages/admin/index.vue:14-22`

- [ ] **Step 1: Adicionar o link na topbar**

Em `app/pages/admin/index.vue`, dentro de `<div class="adm-topbar-right">`, **antes** do `<NuxtLink to="/admin/webhook">`:

```html
                    <NuxtLink to="/admin/push" class="adm-btn-ghost">
                        <Icon name="ph:bell-ringing-bold" /> Notificações
                    </NuxtLink>
```

- [ ] **Step 2: Verificar no navegador**

Abra `http://localhost:3098/admin`.
Expected: o botão "Notificações" aparece na topbar ao lado de "Liberar acesso" e leva para `/admin/push`.

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/index.vue
git commit -m "feat(push): link do painel admin para notificacoes"
```

---

### Task 14: Verificação ponta a ponta

**Files:** nenhum arquivo novo — esta task é só verificação.

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: termina com `✓ You can preview this build using node .output/server/index.mjs`, sem erro de tipo nem de import.

- [ ] **Step 2: Service Worker ativo**

Com `npm run dev` rodando, abra o site em aba anônima → DevTools → Application → Service Workers.
Expected: status **activated and is running**.

- [ ] **Step 3: Inscrição de ponta a ponta**

Ative as notificações pelo card da home.
Expected: documento novo em `push_subscriptions` com `endpoint`, `keys.p256dh`, `keys.auth`, `email` e as duas datas.

- [ ] **Step 4: Envio imediato**

Em `/admin/push`, preencha título e mensagem, deixe em "Agora" e envie.
Expected: a notificação aparece no sistema operacional com o título, a mensagem e o logo do projeto. O painel mostra `Enviadas: 1`.

- [ ] **Step 5: Clique na notificação**

Preencha o campo de link com `/aulas` e envie outra. Clique na notificação.
Expected: abre (ou foca) o app **em `/aulas`**, não na home. Isso prova que o `notificationclick` novo entrou no lugar do antigo.

- [ ] **Step 6: Agendamento**

Agende uma notificação "Uma vez" para 2 minutos à frente.
Expected: dentro de ~2 minutos a notificação chega sozinha; no terminal do servidor aparece `[scheduler] Agendamento "..." disparado:` com o resultado; no painel o job fica com status `done`.

- [ ] **Step 7: Cancelamento da inscrição**

No navegador, bloqueie as notificações do site nas configurações e recarregue.
Expected: o card vira o aviso "Notificações bloqueadas" com as instruções de desbloqueio.

- [ ] **Step 8: Limpeza de inscrição morta**

Insira uma inscrição falsa no banco e dispare um envio:

```bash
curl -s -X POST http://localhost:3098/api/push/subscribe -H "Content-Type: application/json" -d "{\"subscription\":{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/endpoint-invalido-de-teste\",\"keys\":{\"p256dh\":\"BOrfBiRZgxWTNXVPKQZWSDZTQ4jwPRfDMbCiVqkQpQzZzKmWuVQqvBBnXVJqRfLZfJqNvQeVYcQwXHYYlPMhkZk\",\"auth\":\"aUJ0RmZRZ0RmZ0Rm\"}}}"
```

Depois envie uma notificação por `/admin/push`.
Expected: o resultado mostra `removed: 1` (ou mais) e o documento falso sumiu de `push_subscriptions`.

- [ ] **Step 9: Commit final e push da branch**

```bash
git status
git push -u origin feat/notificacoes-push
```

---

## Notas para o revisor

**Fora do escopo deste plano, encontrado durante a análise** — reportar ao usuário, não corrigir aqui:

- `app.html:63,66,90,103` aponta `apple-touch-icon`, `favicon` e as imagens de Open Graph/Twitter para `/images/logo.png`, que não existe. Favicon e preview de link estão quebrados hoje.
- `public/manifest.json` ainda tem `name`/`short_name`/`description` do **Irmandade Club**, não do Rainha da Bet. O plano corrige só os caminhos de ícone (necessários para instalar a PWA e, por consequência, para push no iOS); o texto fica como está.
- `public/sw.js` cacheia respostas de navegação com estratégia network-first sem distinguir HTML de asset. Funciona, mas é a razão de existir o `UpdateNotification.vue`. Não mexer neste plano.
