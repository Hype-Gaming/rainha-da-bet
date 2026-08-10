# Notificações Push (Web Push) — Design

**Data:** 2026-08-08
**Status:** Aprovado
**Origem:** Port do sistema de push já em produção no projeto `clube_BB` (Nuxt 4 + MongoDB, mesma arquitetura).

## Objetivo

Dar ao rainha-da-bet o mesmo sistema de notificações push do clube_BB: o usuário ativa
as notificações no navegador, e o admin dispara avisos — na hora ou agendados
(uma vez / todo dia) — para todos os dispositivos inscritos.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Abordagem | Port fiel arquivo a arquivo do clube_BB | Código já validado em produção; mantém os dois projetos com o mesmo formato mental |
| Escopo | Paridade total | Inscrição + envio manual + agendamento + lista de inscritos + stats |
| Segmentação | Nenhuma: envia para todos | Igual ao clube_BB. O `email` fica salvo na inscrição, então dá pra adicionar filtro depois sem migração |
| Onde ativar | Home + tela de login | Os dois momentos de maior atenção do usuário |
| Transporte | Web Push nativo (VAPID) via `web-push` | Sem SDK de terceiro, sem dependência externa |

Descartado: extrair um Nuxt layer compartilhado entre os dois apps (exigiria mexer no
clube_BB, que está funcionando, para eliminar duplicação em apenas 2 projetos que
evoluem separados); e trocar por OneSignal/Firebase (adiciona terceiro e diverge do
clube_BB, o oposto do pedido).

## Arquitetura

```
Navegador                       Servidor Nitro                  MongoDB
─────────                       ──────────────                  ───────
usePush.ts ──── subscribe ────▶ /api/push/subscribe ─────────▶ push_subscriptions
public/sw.js ◀── push VAPID ─── webpush.ts ◀── pushDispatch.ts ───────┤
                                     ▲                                │
        admin/push.vue ─────▶ /api/admin/push/send ───────────────────┤
                              notification-scheduler ─────────────────┘
                                     ▲
                              scheduled_notifications
```

Cada camada tem um limite claro:

- **`webpush.ts`** só sabe enviar para **uma** inscrição. Nunca lança: devolve
  `{ ok, gone, statusCode }` e deixa o chamador decidir o que fazer.
- **`pushDispatch.ts`** só sabe percorrer todas as inscrições e limpar as mortas.
  Não conhece HTTP nem admin.
- **Os endpoints** só validam entrada e autorização, e delegam.
- **O scheduler** só decide *quando*, e delega o *como* ao `pushDispatch`.

## Modelo de dados

### `push_subscriptions`

```
{
  endpoint: string,          // único; identifica navegador+dispositivo
  keys: { p256dh, auth },    // chaves de criptografia do navegador
  email: string | null,      // do usuário logado, quando houver
  created_at: Date,
  updated_at: Date
}
```

Upsert chaveado por `endpoint`. Índice único em `endpoint`.

### `scheduled_notifications`

```
{
  title, body, url, icon,
  type: 'once' | 'daily',
  time: string | null,        // rótulo HH:mm, para exibição e para 'daily'
  nextRunAt: Date,            // próximo disparo
  status: 'active' | 'sending' | 'done',
  createdAt, lastSentAt, lastResult
}
```

Índice em `{ status: 1, nextRunAt: 1 }` para o scheduler.

## Arquivos

### Novos (14)

| Arquivo | Papel |
|---|---|
| `server/utils/webpush.ts` | Config VAPID lazy; envio para uma inscrição |
| `server/utils/pushDispatch.ts` | Envio em lote + remoção das inscrições mortas |
| `server/plugins/notification-scheduler.ts` | Tick de 60s; dispara agendamentos vencidos |
| `server/api/push/subscribe.post.ts` | Upsert da inscrição |
| `server/api/push/unsubscribe.post.ts` | Remove a inscrição |
| `server/api/push/vapid-public-key.get.ts` | Expõe a chave pública; 503 se não configurado |
| `server/api/admin/push/send.post.ts` | Envio imediato para todos |
| `server/api/admin/push/scheduled.get.ts` | Lista agendamentos (50) |
| `server/api/admin/push/scheduled.post.ts` | Cria agendamento |
| `server/api/admin/push/scheduled/[id].delete.ts` | Cancela agendamento |
| `server/api/admin/push/stats.get.ts` | `{ configured, total, withEmail }` |
| `server/api/admin/push/subscriptions.get.ts` | Lista 200 inscritos com `$lookup` em `app_users` |
| `app/composables/usePush.ts` | Permissão, inscrição, `refresh()` de re-sincronização |
| `app/pages/admin/push.vue` | Painel: compor, agendar, inscritos, agendamentos |

### Alterados (5)

| Arquivo | Mudança |
|---|---|
| `public/sw.js` | Corrigir `urlsToCache`; trocar handler `push` e `notificationclick` |
| `app/pages/index.vue` | Card "Ativar notificações" |
| `app/pages/auth/login.vue` | Mesmo card |
| `.env.example` | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| `package.json` | `web-push` + `@types/web-push` |

## Adaptações em relação ao clube_BB

O port é fiel, com exatamente quatro divergências — todas obrigatórias:

1. **Auth do admin.** O clube_BB usa `requireAdminSession(event)` (sessão por cookie).
   O rainha-da-bet usa `requireAdmin(event)` de `server/utils/admin.ts`, que valida um
   token HMAC no header `Authorization: Bearer`. Todos os endpoints sob
   `/api/admin/push/` usam `requireAdmin`. No cliente, `admin/push.vue` chama
   `adminFetch` do composable `useAdmin` (que já injeta o header e derruba a sessão no 401),
   nunca `$fetch` direto.

2. **Caminho do ícone.** O clube_BB referencia `/images/logo.png`. Esse arquivo **não
   existe** no rainha-da-bet — `public/` tem `logo.png` na raiz e não tem diretório
   `images/`. Todo default de ícone/badge passa a ser `/logo.png`.

3. **Correção do Service Worker (bloqueante).** O `public/sw.js` atual do rainha-da-bet
   lista `/images/logo.png` em `urlsToCache`. Como `cache.addAll` rejeita por inteiro se
   qualquer URL falhar, o evento `install` falha e o Service Worker nunca ativa — sem SW
   ativo não existe push. `urlsToCache` passa a listar apenas caminhos que existem
   (`/`, `/auth/login`, `/logo.png`, `/robots.txt`), e `CACHE_NAME` sobe para
   `rainha-da-bet-v2` para que o `activate` limpe o cache antigo.

4. **Concorrência no disparo.** O `pushDispatch` do clube_BB usa um `Promise.all` sobre
   todas as inscrições de uma vez. No rainha-da-bet o envio é feito em **lotes de 50**
   (sequenciais entre lotes, paralelos dentro do lote), para não abrir centenas de
   conexões simultâneas com os push services conforme a base cresce. O resultado
   agregado (`{ sent, failed, removed, total }`) é idêntico.

Além disso, o `sw.js` do rainha-da-bet tem hoje um handler `push` antigo que trata o
payload como **texto cru** e ignora `title`/`url`. Ele é substituído pelo handler do
clube_BB, que lê JSON (`{ title, body, url, icon }`) com fallback para texto e para push
sem payload, e por um `notificationclick` que foca uma aba aberta e navega para a URL do
payload em vez de sempre abrir `/`.

## Fluxos

### Inscrição

1. Usuário toca em "Ativar notificações" na home ou no login.
2. `usePush.subscribe(email)` chama `Notification.requestPermission()`.
3. Concedida: busca a chave pública em `/api/push/vapid-public-key`, garante um Service
   Worker **ativo** (`getActiveRegistration`: registra `/sw.js` se preciso e espera o
   estado `activated`, com timeout de 10s), chama `pushManager.subscribe()` e envia a
   inscrição para `/api/push/subscribe`.
4. Negada: o card vira um aviso com instruções de como desbloquear no navegador.

O `refresh()` roda no `onMounted` de cada página com o card e re-envia a inscrição
existente ao servidor. Isso **auto-cura** o caso em que o navegador já está inscrito mas
o salvamento anterior falhou (ex.: servidor fora no momento do clique): basta recarregar.

### Envio imediato

`admin/push.vue` → `POST /api/admin/push/send` → `dispatchToAllSubscriptions` → um
`webpush.sendNotification` por inscrição → o painel mostra `{ sent, failed, removed, total }`.

### Agendamento

`POST /api/admin/push/scheduled` grava o job com `nextRunAt` calculado no cliente a partir
do fuso local. O plugin Nitro roda a cada 60s e, para cada job vencido, faz um **claim
atômico** (`findOneAndUpdate` de `status: 'active'` para `'sending'`) antes de disparar —
é isso que impede disparo duplicado. Job `daily` é reagendado para a próxima ocorrência
futura do mesmo horário; job `once` vira `done`.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| VAPID ausente no `.env` | `isPushConfigured()` retorna false; endpoints respondem 503 com mensagem clara; scheduler não dispara; painel mostra "push não configurado" |
| Navegador sem suporte | `usePush` marca `permission = 'unsupported'`; o card não aparece |
| Permissão negada | Card vira aviso com instruções de desbloqueio |
| Service Worker não ativa em 10s | Erro específico: "O Service Worker não ativou. Recarregue a página e tente de novo." |
| Inscrição morta (404/410) | Marcada como `gone` e removida em lote do banco no fim do disparo |
| Outra falha de envio | Logada com status code; conta em `failed`; a inscrição é preservada |
| Falha no disparo agendado | Logada; o job **não** fica preso em `'sending'` (o resultado é gravado e o status resolvido no `finally` do fluxo) |

## Verificação

Não há suite de testes no projeto. A verificação é manual, em ordem:

1. `npm run build` conclui sem erro de tipo.
2. DevTools → Application → Service Workers: o SW aparece **activated** (prova a
   correção do `urlsToCache`).
3. Ativar as notificações na home → o documento aparece em `push_subscriptions`.
4. `/admin/push` → envio de teste → notificação chega com título, corpo e ícone certos.
5. Clicar na notificação → abre/foca na URL informada, não em `/`.
6. Agendar para 2 minutos à frente → dispara sozinho; o job vira `done` (ou é reagendado, se `daily`).
7. Desativar as notificações → o documento some de `push_subscriptions`.

## Fora de escopo

- Segmentação por assinatura, tag ou status de bloqueio
- Histórico/log de notificações enviadas
- Imagens grandes ou botões de ação na notificação
- Push para iOS fora de PWA instalada (limitação do próprio Safari)
