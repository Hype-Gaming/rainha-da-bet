# Painel Admin + Fila de Liberação de Acesso — Design

**Data:** 2026-06-08
**App:** Rainha da Bet (Nuxt 3)

## Problema

Compras na Lastlink (PIX/cartão) às vezes não criam o registro em `subscriptions`
(ver [ajustes.md](../../../ajustes.md)). O usuário paga, faz login com a conta
esportiva.bet, clica em "Verificar Acesso" e cai num beco sem saída: a verificação
falha e ele continua sem acesso. Hoje a liberação é manual, via CLI ou painel externo.

## Objetivo

1. Quando a verificação de acesso falhar, o usuário pode **solicitar liberação** —
   isso cria um pedido numa fila.
2. Um **painel admin** (`/admin`) onde admins veem a fila, aprovam/recusam pedidos,
   buscam qualquer email para liberar/bloquear direto, e veem métricas básicas.

## Princípios / restrições (decididos com o usuário)

- **Schema do MongoDB não muda.** As collections existentes continuam idênticas.
- **Aprovação grava 100% no formato do webhook** — sem campo novo, sem marcador
  `manual`. Mesmo `updateOne` que o webhook faz para uma assinatura ativa.
- **Auth do admin por allowlist de email no `.env`** (`ADMIN_EMAILS`). O admin loga
  com a conta esportiva.bet normal (login Cactus já existente); o sistema confere o
  email contra a allowlist. Sem senha de admin separada.
- Visual escuro/rosa (`#fb65a6`) já usado no app.

## Modelo de dados

### Collection existente: `subscriptions` (inalterada)
Formato atual, gravado pelo webhook:
```js
{ email, status: 'active'|'inactive', role: 'paid'|'free',
  lastlink_status, lastlink_order_id, product, updated_at, created_at }
```
Lido por [server/api/subscription/check.get.ts](../../../server/api/subscription/check.get.ts)
(só usa `status`).

### Collection nova: `access_requests`
```js
{
  email: string,        // minúsculo, identifica o pedido
  name: string|null,    // do usuário logado (Cactus), quando houver
  phone: string|null,
  status: 'pending'|'approved'|'rejected',
  created_at: Date,
  resolved_at: Date|null
}
```
**Sem duplicatas:** novo pedido do mesmo email enquanto `pending` faz `updateOne`
(upsert) no mesmo doc, não cria outro.

## Backend (Nuxt server)

### `server/utils/admin.ts` — `requireAdmin(event)`
- Lê o header `Authorization: Bearer <token>` e `x-cactus-cookie-key` enviados pelo front.
- Valida o token chamando a API Cactus `GET /api/auth/user`
  (`https://routes-eb.grupoautoma.com`, headers de marca já usados no
  [useAuth.ts](../../../app/composables/useAuth.ts)).
- Pega o email retornado, normaliza (lowercase) e confere contra
  `process.env.ADMIN_EMAILS` (lista separada por vírgula).
- Token inválido → 401. Email fora da allowlist → 403. Sucesso → retorna o email do admin.
- Usado no início de **todos** os handlers `/api/admin/*`.

### Endpoints

| Método | Rota | Proteção | Função |
|---|---|---|---|
| POST | `/api/access-request` | pública (usuário logado) | cria/atualiza pedido `pending` por email |
| GET | `/api/admin/me` | requireAdmin | confirma que o usuário logado é admin (pro middleware) |
| GET | `/api/admin/requests?status=pending` | requireAdmin | lista pedidos da fila |
| POST | `/api/admin/requests/approve` | requireAdmin | aprova: upsert subscription ativa + marca pedido `approved` |
| POST | `/api/admin/requests/reject` | requireAdmin | marca pedido `rejected` |
| GET | `/api/admin/subscriptions?search=<email>` | requireAdmin | busca assinaturas por email (parcial) |
| POST | `/api/admin/subscriptions/set-status` | requireAdmin | libera/bloqueia qualquer email (`active`/`inactive`) |
| GET | `/api/admin/metrics` | requireAdmin | contagens: ativos, inativos, pedidos pendentes |

### `POST /api/access-request` (corpo)
```json
{ "email": "cliente@x.com", "name": "Nome", "phone": "..." }
```
Upsert em `access_requests` por `{ email, status: 'pending' }`, `$setOnInsert` em
`created_at`. Retorna `{ ok: true }`.

### Aprovação — grava idêntico ao webhook
`/api/admin/requests/approve` e `/api/admin/subscriptions/set-status` (quando `active`)
fazem exatamente o `updateOne` do webhook para assinatura ativa:
```js
await col.updateOne(
  { email: email.toLowerCase() },
  {
    $set: {
      email: email.toLowerCase(),
      status: 'active',
      role: 'paid',
      lastlink_status: null,
      lastlink_order_id: null,
      product: null,
      updated_at: new Date()
    },
    $setOnInsert: { created_at: new Date() }
  },
  { upsert: true }
)
```
Bloquear (`set-status` com `inactive`) faz o mesmo com `status:'inactive'`, `role:'free'`.
`approve` também atualiza o pedido para `status:'approved'`, `resolved_at: new Date()`.

> Nota: como não há payload da Lastlink numa liberação manual, os campos
> `lastlink_*`/`product` ficam `null` — mesma estrutura do doc, sem campos extras.

## Frontend

### `app/composables/useAdmin.ts`
- Reaproveita o token/cookieKey do [useAuth.ts](../../../app/composables/useAuth.ts).
- `adminFetch(url, opts)`: injeta `Authorization`, `X-Brand-Slug`, `X-Base-Domain`,
  `X-Cactus-Cookie-Key` (mesmos headers do useAuth). Em 401/403, limpa estado admin
  e redireciona para `/`.
- `isAdmin` (ref), `checkAdmin()` (chama `/api/admin/me`).

### `app/middleware/admin.ts`
- Aplicado às rotas `/admin/*` (via `definePageMeta({ middleware: 'admin' })`).
- Sem login → redireciona para `/auth/login`. Logado mas não admin → redireciona para `/`.

### `app/composables/useAccessRequest.ts`
- `requestAccess(email, name?, phone?)` → `POST /api/access-request`.
- Estados `sending`, `sent`, `error` para a UI.

### Páginas / componentes
- **`app/pages/admin/index.vue`** — única página do painel:
  - Topo: cards de métricas (ativos / inativos / pendentes).
  - Seção **Pedidos**: lista da fila com email, nome, data + botões Aprovar / Recusar.
  - Seção **Assinaturas**: busca por email + botão Liberar/Bloquear.
- **`app/components/SubscriptionModal.vue`** (editar): quando `checkSubscription`
  retorna inativo, mostrar botão **"Solicitar liberação de acesso"** → `requestAccess`.
  Após enviar: mensagem "Pedido enviado, em breve liberaremos seu acesso."
- **`app/pages/assinar.vue`** (editar): no ramo de falha de `verificarAcesso`, mesmo
  botão **"Solicitar liberação de acesso"** (email vem do usuário logado).

## Config

- `.env.example`: adicionar `ADMIN_EMAILS=` (lista separada por vírgula).
- Sem `ADMIN_EMAILS` definido → nenhum email é admin (painel inacessível). Seguro por padrão.

## Tratamento de erros

- `requireAdmin`: 401 (token inválido) / 403 (não-admin). Front trata limpando estado
  e redirecionando.
- `access-request`: valida formato de email; sem email → 400.
- Falha de conexão Mongo: 500 com mensagem genérica (não vaza detalhe).
- Pedido aprovado/recusado que não existe mais: retorna ok idempotente.

## Verificação (sem suíte de testes automatizada no projeto)

1. `curl` em `/api/access-request` cria doc `pending` em `access_requests`.
2. `curl` em `/api/admin/requests` sem token → 401; com email fora da allowlist → 403.
3. Aprovar um pedido → doc em `subscriptions` com `status:'active'` no formato do webhook;
   `/api/subscription/check` passa a retornar `active:true` para o email.
4. Clicar "Solicitar liberação" no modal e na página assinar cria o pedido.
5. Login com email da `ADMIN_EMAILS` abre `/admin`; email comum é redirecionado.

## Fora de escopo (YAGNI)

- Notificação ativa ao usuário quando liberado (ele revê ao verificar/recarregar).
- Logs/histórico do webhook no painel.
- Paginação avançada / exportação (lista simples basta para o volume atual: ~15 ativos).
