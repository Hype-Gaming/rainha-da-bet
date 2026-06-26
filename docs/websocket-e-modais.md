# WebSocket de Sinais e Modais do Frontend — Irmandade Club

> Documentação técnica do fluxo de conexão WebSocket para sinais ao vivo e dos modais de interação com o usuário.

---

## 1. WebSocket de Sinais (`jogo/[id].vue`)

### 1.1 Visão Geral

Cada página de jogo estabelece uma conexão WebSocket dedicada que recebe sinais ao vivo do servidor. O fluxo completo é:

```
onMounted → loadGame() → fetchGameConfig(gameId) → connectSignalWs()
```

### 1.2 Configuração da Conexão

**Constantes envolvidas** (em `useGame.ts`):

| Constante | Valor padrão | Descrição |
|---|---|---|
| `SIGNAL_API_BASE` | `https://api-apps-server.automagroup.com.br` | API que fornece a config do WSS |
| `signalUrl` (fallback) | `wss://ws-signals.grupoautoma.com/ws` | URL padrão usada se a API retornar 404 |
| `SIGNAL_RECONNECT_MS` | `3000` | Tempo (ms) para reconexão automática |

**Busca da config via `fetchGameConfig(gameId)`** (`useGame.ts`):

1. Lê o `signalRef` do jogo em `gameRoutes.ts` (`{ collection, name }`).
2. Faz `GET /api/game-config/{collection}/{name}` na `SIGNAL_API_BASE`.
3. Se a resposta contiver `sinais_wss.signalUrl` e `sinais_wss.signalName`, usa esses valores.
4. Se a API retornar `404`, adiciona a chave ao `Set` `UNAVAILABLE_SIGNAL_CONFIGS` (evita chamadas repetidas) e usa o fallback hardcoded.
5. Qualquer outro erro também cai no fallback.

Resultado armazenado em `gameSignalConfig` (composable `useGame`):

```ts
interface GameSignalConfig {
  signalUrl: string       // URL WSS
  signalName: string      // Nome do canal de assinatura
  signalCollection?: string // Coleção (opcional)
}
```

### 1.3 Função `connectSignalWs()`

```
1. Lê gameSignalConfig.value
2. Cancela timer de reconexão pendente
3. Fecha conexão anterior (sem disparar onclose)
4. Força protocolo wss:// quando a página está em https:
5. Abre new WebSocket(wsUrl)
6. onopen  → envia { type: 'subscribe', name, collection? }
7. onmessage → chama handleWsMessage(event.data)
8. onerror  → desliga spinner de loading
9. onclose  → agenda reconexão em SIGNAL_RECONNECT_MS (3 s)
             se signalWsDestroyed === false
```

### 1.4 Protocolo de Mensagens

**Mensagem de inscrição (cliente → servidor):**

```json
{
  "type": "subscribe",
  "name": "bac-bo-ao-vivo-default",
  "collection": "bac_bo_ao_vivo"
}
```

**Mensagem recebida (servidor → cliente):**

```json
{
  "status": "signal | alert | win | loss | cancelled",
  "message": "Texto descritivo da entrada",
  "greens": 1,
  "assertividade": "87%"
}
```

### 1.5 Interpretação de `status` — `setSignalFromWsStatus(data)`

| `status` | Efeito na UI |
|---|---|
| `signal` | Exibe "👉 ENTRADA RECOMENDADA", mostra `message`, calcula `signalTarget`, define `tentativas` como `G{greens}` |
| `alert` | Exibe "⚠️ FIQUE ATENTO", atualiza `sinal` e `tentativas` sem resetar |
| `win` | Exibe "✅ GREEN", reseta `signalTarget` e `tentativas`, aciona `fetchResults()` após 2 s |
| `loss` | Exibe "❌ LOSS", reseta `signalTarget` e `tentativas`, aciona `fetchResults()` após 2 s |
| `cancelled` | Exibe "❌ PADRAO CANCELADO", limpa todos os campos de sinal |

**Extração do alvo (`extractTarget`):** analisa o campo `message` por palavras-chave (`player`, `banker`, `tie`, `casa`, `visitante`, `empate`, `red`, `yellow`, `azul`, `roxo`, `rosa`) e mapeia para o canônico `'Player' | 'Banker' | 'Tie'`.

### 1.6 Reconexão Automática

- Ao detectar `onclose`, a função agenda `connectSignalWs()` com `setTimeout(3000)`.
- A flag `signalWsDestroyed` é `true` apenas quando o componente é desmontado — impede reconexão após saída da página.
- `disconnectSignalWs()` é chamado em `onUnmounted`, encerrando a conexão de forma limpa.

---

## 2. Modais do Frontend

### 2.1 `SubscriptionModal.vue`

**Propósito:** Verificar se o usuário possui assinatura ativa antes de conceder acesso ao conteúdo.

**Composable:** `useSubscription.ts`

**Fluxo:**

```
init(email?) →
  └─ cache válido (sessionStorage, TTL 5 min) → aplica estado do cache
  └─ sem cache + email fornecido → checkSubscription(email)
  └─ sem cache + sem email → abre modal (showModal = true)
```

**Verificação via API:**

- Endpoint: `GET /api/subscription/check?email={email}` (rota Nuxt server)
- Resposta: `{ active: boolean, role: 'paid' | 'free' }`
- Resultado salvo em `sessionStorage` com chave `irmandade_subscription` por 5 minutos

**Estados do composable:**

| Estado | Tipo | Descrição |
|---|---|---|
| `isSubscribed` | `boolean` | Assinatura ativa |
| `role` | `'paid' \| 'free'` | Plano do usuário |
| `showModal` | `boolean` | Controla visibilidade do modal |
| `checked` | `boolean` | Se a verificação já foi realizada |
| `checking` | `boolean` | Loading durante chamada à API |
| `error` | `string` | Mensagem de erro |

**Ações disponíveis:**

| Função | Descrição |
|---|---|
| `init(email?, options?)` | Inicializa verificação (com cache) |
| `checkSubscription(email)` | Força verificação via API |
| `dismissModal()` | Fecha modal e grava flag em `sessionStorage` |
| `openModal()` | Reabre o modal manualmente |
| `clearSubscriptionCache()` | Limpa cache de sessão (exportada fora do composable) |

**Template resumido:**

- Campo de e-mail + botão "Verificar Acesso" → chama `checkSubscription`
- Link "Assinar Agora" → aponta para `https://lastlink.com/p/C80B167D8/checkout-payment`
- Botão "Continuar sem assinar" → chama `dismissModal()`
- Transição CSS `modal-fade` + `backdrop-filter: blur(10px)`

---

### 2.2 `DepositModal.vue`

**Propósito:** Fluxo de depósito via PIX em 3 etapas.

**Composable:** `useDeposit.ts`

**Etapas (`step`):**

| Etapa | Conteúdo |
|---|---|
| `amount` | Input numérico + atalhos de valor rápido (R$ 10, 20, 50, 100, 200, 500) |
| `payment` | QR Code + código Copia e Cola + instruções de pagamento |
| `success` | Confirmação de pagamento em processamento |

**Fluxo de criação de depósito:**

```
createDeposit(amount) →
  POST /api/deposit
  Headers: Authorization Bearer {token}, X-Brand-Slug, X-Cactus-Cookie-Key
  Body: { amount }
  → success: move para step 'payment', armazena DepositResponse
  → falha: exibe error
```

**Interface `DepositResponse`:**

```ts
{
  success: boolean
  transaction_id: string
  payment_link: string
  qr_code: string      // URL da imagem do QR Code
  br_code: string      // Código PIX copia e cola
  value: number
  amount: number
  amount_cents: number
  user_id: number
}
```

**Estado global reativo** (`depositState`):

| Campo | Tipo | Descrição |
|---|---|---|
| `isModalOpen` | `boolean` | Controla visibilidade |
| `step` | `'amount' \| 'payment' \| 'success'` | Etapa atual |
| `amount` | `number` | Valor confirmado |
| `depositData` | `DepositResponse \| null` | Dados do PIX gerado |
| `loading` | `boolean` | Requisição em andamento |
| `error` | `string \| null` | Mensagem de erro |

---

### 2.3 `KycModal.vue`

**Propósito:** Bloquear acesso e exigir verificação KYC antes do primeiro uso.

**Props:** `show: boolean`

**Emits:** `logout` (usuário opta por sair e fazer login depois)

**Comportamento automático:**

- Ao abrir (`show = true`), aguarda **3 segundos** e redireciona automaticamente para o link de KYC da Esportiva em nova aba.
- `onUnmounted` limpa o `setTimeout` para evitar memory leaks.

**Passos exibidos ao usuário:**

1. Acesse sua conta na Esportiva
2. Vá em Configurações > Verificação
3. Envie seus documentos e selfie
4. Aguarde a aprovação (até 24 h)

**Link de KYC:** `https://go.aff.esportiva.bet/imo5e5c7`

---

## 3. Relação entre Modais e o Fluxo de Acesso

```
Usuário acessa a aplicação
        │
        ▼
auth.global.ts → não autenticado → /auth/login
        │
        ▼ (autenticado)
index.vue → useSubscription.init(email)
        │
        ├─ assinatura inativa → SubscriptionModal (showModal = true)
        │         └─ verifica e-mail → /api/subscription/check
        │
        └─ assinatura ativa
                  │
                  ▼
           KycModal (show = !kycOk)
                  │
                  └─ redirect automático 3 s → Esportiva KYC
                  
Acesso liberado → Dashboard com jogos
        │
        ▼
jogo/[id].vue
  ├─ fetchGameConfig → SIGNAL_API_BASE ou fallback wss://
  ├─ connectSignalWs → WebSocket (subscribe)
  └─ DepositModal (abre via botão na UI)
```

---

## 4. Substituições Necessárias em Novo Projeto

| Arquivo | Campo | Valor atual |
|---|---|---|
| `useGame.ts` | `SIGNAL_API_BASE` | `https://api-apps-server.automagroup.com.br` |
| `useGame.ts` | fallback `signalUrl` | `wss://ws-signals.grupoautoma.com/ws` |
| `useDeposit.ts` | `API_BASE_URL` | `https://routes-eb.grupoautoma.com` |
| `useDeposit.ts` | `BRAND_SLUG` | `esportiva` |
| `KycModal.vue` | link KYC | `https://go.aff.esportiva.bet/imo5e5c7` |
| `SubscriptionModal.vue` | `checkoutUrl` | `https://lastlink.com/p/C80B167D8/checkout-payment` |
| `useSubscription.ts` | `SUBSCRIPTION_SESSION_KEY` | `irmandade_subscription` |
| `useSubscription.ts` | `CACHE_TTL_MS` | `5 * 60 * 1000` (5 min) |
