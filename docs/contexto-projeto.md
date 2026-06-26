# Contexto do Projeto — Irmandade Club (HypeGaming)

> Documento de contexto completo para replicar este projeto ou continuar desenvolvimento em outro ambiente.

---

## Stack

| Item | Valor |
|---|---|
| Framework | Nuxt 4 (SPA) |
| Vue | 3 (Composition API) |
| TypeScript | Sim |
| SSR | `false` (client-only) |
| Pasta de código | `app/` |
| CSS | Tailwind + `app/assets/css/main.css` |
| Ícones | `nuxt-icon` (`ph:` = Phosphor Icons) |
| Máscaras de input | `maska` (plugin em `app/plugins/maska.ts`) |
| Runtime config | `nuxt.config.ts` |

---

## Estrutura de Pastas

```
app/
  app.vue                    ← Raiz da aplicação
  assets/css/main.css        ← Estilos globais
  components/
    DepositModal.vue         ← Modal de depósito
    KycModal.vue             ← Modal de KYC
    PageLoader.vue           ← Loading de página
    UpdateNotification.vue   ← Notificação de atualização de versão
  composables/
    useAuth.ts               ← Autenticação (token, cookieKey, clearAuth)
    useDeposit.ts            ← Fluxo de depósito
    useGame.ts               ← Config de sinal + iniciar jogo (iframe)
  constants/
    gameRoutes.ts            ← Registro central de todos os jogos
  middleware/
    auth.global.ts           ← Redireciona para /auth/login se não autenticado
    auth.ts                  ← Middleware de rota específica
  pages/
    index.vue                ← Dashboard / homepage
    aulas.vue                ← Página de aulas
    gestao.vue               ← Página de gestão
    assinar.vue              ← Página de assinatura/checkout
    assinar-replicavel.vue   ← Cópia de assinar.vue para replicação
    auth/login.vue           ← Login
    jogo/[id].vue            ← Página dinâmica de cada jogo
  plugins/
    maska.ts                 ← Plugin maska para máscaras de input
public/
  manifest.json
  robots.txt
  sw.js                      ← Service Worker
  version.json               ← Versão do app (para UpdateNotification)
  banners/                   ← Imagens de banners
  cards/                     ← Imagens dos cards de jogos
  games/                     ← Outros assets de jogos
docs/
  catalogador-signal-frontend.md  ← Documentação técnica da arquitetura
  contexto-projeto.md             ← Este arquivo
```

---

## APIs Externas

| API | URL | Uso |
|---|---|---|
| Auth / Start Game | `https://routes-eb.grupoautoma.com` | Login, iniciar iframe do jogo |
| Signal Config | `https://api-apps-server.automagroup.com.br` | Config do WebSocket por jogo (retorna 404 atualmente → fallback hardcoded) |
| Catalogador | `https://casino-data.grupoautoma.com` | Histórico de resultados por jogo |
| WebSocket Sinais | `wss://ws-signals.grupoautoma.com/ws` | Sinais ao vivo (subscribe por collection + name) |

### Constantes que precisam ser trocadas em novo projeto

| Arquivo | Constante | Valor atual |
|---|---|---|
| `useGame.ts` | `API_BASE` | `https://routes-eb.grupoautoma.com` |
| `useGame.ts` | `SIGNAL_API_BASE` | `https://api-apps-server.automagroup.com.br` |
| `useGame.ts` | `BRAND_SLUG` | `esportiva` |
| `jogo/[id].vue` | `CATALOGADOR_BASE` | `https://casino-data.grupoautoma.com` |
| `jogo/[id].vue` | fallback `signalUrl` | `wss://ws-signals.grupoautoma.com/ws` |

---

## Autenticação

- Composable: `useAuth.ts`
- Token armazenado em cookie (chave: `cookieKey`)
- Middleware global `auth.global.ts` redireciona para `/auth/login` se não autenticado
- API de login: `POST /auth/login` em `API_BASE`
- Planos: `isPaid` (premium) e `isClaude` (plano claude) controlam acesso a conteúdos

---

## Jogos Registrados

Todos em `app/constants/gameRoutes.ts`:

| id | displayName | Collection Catalogador | Game Catalogador | Collection Sinal | Name Sinal |
|---|---|---|---|---|---|
| `bac-bo` | Bac Bo | `evolution` | `Bac Bo` | `bac_bo_english` | `bac-bo-ao-vivo-default` |
| `bac-bo-en` | Bac Bo EN | `evolution` | `Bac Bo English` | `bac_bo_english` | `bac-bo-default` |
| `bac-bo-brasileiro` | Bac Bo Brasileiro | `evolution` | `Bac Bo Brasileiro` | `bac_bo_ao_vivo` | `bac-bo-ao-vivo-default` |
| `bac-bo-sem-gale` | Bac Bo - Sinal Sem Gale | `evolution` | `Bac Bo Sem Gale` | `bac_bo_sem_gale` | `bac-bo-sem-gale` |
| `football-studio` | Football Studio | `evolution` | `Football Studio English` | `football_studio_english` | `football-studio-eng-default` |
| `dragon-tiger` | Dragon Tiger | `evolution` | `Dragon Tiger` | `dragon_tiger_evolution` | `default` |
| `aviator` | Aviator | `spribe` | `aviatorlotogreen` | `aviator_spribe` | `aviator-spribe-default` |
| `baccarat` | Baccarat | `evolution` | `Speed Baccarat A` | `baccarat` | `default` |

### Jogos com `resolvedId` (reutilizam iframe de outro jogo)

| id | resolvedId | Motivo |
|---|---|---|
| `bac-bo-brasileiro` | `bac-bo` | Mesma mesa, sinal diferente |
| `bac-bo-sem-gale` | `bac-bo-en` | Mesma mesa, sinal sem gale |

---

## Página de Jogo (`jogo/[id].vue`)

### Computed principais

| Computed | Descrição |
|---|---|
| `gameId` | ID da rota atual |
| `resolvedGameId` | ID resolvido (segue `resolvedId` se existir) |
| `routeGameConfig` | Config completa do jogo atual |
| `isAviator` | `gameId === 'aviator'` |
| `outcomeMeta` | Labels e letras dos resultados por jogo |
| `catalogadorUi` | Textos da UI por jogo (títulos, labels) |
| `themeStyles` | CSS custom properties de cores por jogo |
| `filteredResults` | Resultados após filtros de cor, data e quantidade |
| `baseResults` | Resultados sem filtro de cor (para estatísticas avançadas) |
| `stats` | % de Player/Banker/Tie |
| `advancedStats` | Máximas, ausências, repetições atuais |
| `strategies` | Top 15 padrões com maior taxa de acerto até G2 |

### Customizações por jogo

#### `outcomeMeta` (rótulos dos resultados)

| Jogo | Player | Banker | Tie |
|---|---|---|---|
| padrão (bac-bo, baccarat) | Player / P | Banker / B | Tie / T |
| `football-studio` | Casa / C | Visitante / V | Empate / E |
| `dragon-tiger` | Dragon / D | Tiger / T | Empate / E |
| `aviator` | Azul / A | Roxo / R | Rosa / P |

#### `normalizeWinner` (mapeamento do banco para canônico)

| Jogo | Regra |
|---|---|
| `football-studio` | `casa→Player`, `visitante→Banker`, `empate→Tie` |
| `dragon-tiger` | `red→Player`, `yellow→Banker`, `tie→Tie` |
| `aviator` | Classifica por `multiplier`: `≥10→Tie`, `≥2→Banker`, `<2→Player` |
| outros | `player→Player`, `banker→Banker`, `tie→Tie` |

### Aviator — comportamentos especiais

- Usa campo `multiplier` ao invés de `Score`
- Grid responsivo: `grid-template-columns: repeat(auto-fit, minmax(54px, 1fr))`
- Seção de estratégias oculta (`v-if="!isAviator"`)
- Filtros extras: por cor + por data + limite de rodadas

### Sinais — `setSignalFromWsStatus`

| status | Ação |
|---|---|
| `signal` | Exibe entrada + greens + alvo extraído da mensagem |
| `alert` | Exibe alerta de atenção |
| `win` | ✅ GREEN + limpa sinal + `fetchResults()` após 2s |
| `loss` | ❌ LOSS + limpa sinal + `fetchResults()` após 2s |
| `cancelled` | Padrão cancelado + limpa tudo |

### Polling

`fetchResults()` é chamado **apenas**:
1. Na montagem da página (`onMounted`)
2. Após eventos `win` ou `loss` do WebSocket (delay 2s)

> Não existe polling automático por intervalo — foi removido intencionalmente.

---

## Homepage (`index.vue`)

### Cards de jogos

- **Premium locked** (`.card-premium-locked`): exibe imagem com `opacity: 0.34` quando `is-locked` (usuário não pagou)
- **Claude locked** (`.card-claude-locked`): mesmo comportamento
- Ícone de cadeado visível quando `is-locked`
- **Não existe** badge de "desbloqueado" — apenas o cadeado some quando pago

```html
<!-- Exemplo de binding -->
<div class="game-card card-premium-locked" :class="{ 'is-locked': !isPaid }">
  <div class="game-image">
    <img v-if="game.image" :src="game.image" />
    <Icon v-if="!isPaid" name="ph:lock-bold" class="lock-icon" />
  </div>
</div>
```

```css
.card-premium-locked.is-locked .game-image img { opacity: 0.34; }
.card-claude-locked.is-locked  .game-image img { opacity: 0.34; }
```

### Seções removidas neste projeto

- Seção de mentoria (removida)
- Seção de link-cards (removida)

---

## PWA / Service Worker

- `public/sw.js` — Service Worker manual
- `public/version.json` — Versão atual do app
- `UpdateNotification.vue` — Notifica o usuário quando há nova versão disponível

---

## Decisões de Arquitetura

| Decisão | Motivo |
|---|---|
| `ssr: false` | SPA puro — sem hydration, mais simples para apps autenticados |
| `gameRoutes.ts` como fonte única | Centraliza catalogador + sinal + slug em um só lugar |
| Fallback hardcoded para WSS | API de config retorna 404; fallback garante que sinais funcionem |
| `UNAVAILABLE_SIGNAL_CONFIGS` (Set) | Evita múltiplas requisições 404 para a mesma config durante a sessão |
| Sem polling no catalogador | Resultados são atualizados apenas quando necessário (mount + win/loss) |
| `resolvedId` | Permite múltiplos sinais para a mesma mesa sem duplicar config de jogo |
| Estratégias calculadas no frontend | Análise de padrões G0/G1/G2 sem backend adicional |

---

## Problemas Conhecidos

| Problema | Status | Contorno |
|---|---|---|
| `GET /api/game-config/...` retorna 404 | Em aberto | Fallback hardcoded funciona corretamente |
| WebSocket conecta mas não entrega eventos em janela de teste | Normal | Sinais dependem de eventos reais da mesa |
| `multiplier` vazio no Aviator | Resolvido | Dados do catalogador passam `multiplier` corretamente |

---

## Como Iniciar o Projeto

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build

# PM2 (produção)
pm2 start ecosystem.config.cjs
```

---

## Referência Rápida — Adicionar Novo Jogo

1. **`gameRoutes.ts`** — adicionar entrada com `catalogador` e `signalRef`
2. **`jogo/[id].vue`** — adicionar case em `outcomeMeta`, `catalogadorUi`, `themeStyles` e `normalizeWinner` se necessário
3. **`index.vue`** — adicionar card na homepage se necessário
4. Testar catalogador: `GET https://casino-data.grupoautoma.com/results?collection=<col>&game=<game>&limit=10`
5. Testar WebSocket: subscribe com `{ type:'subscribe', name:'<name>', collection:'<collection>' }`
