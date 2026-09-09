# Sinais via WebSocket: migração para query string

**Data:** 08/09/2026 · **Arquivos:** [app/pages/jogo/[id].vue](../app/pages/jogo/[id].vue), [scripts/migrar-sinais-wss.mjs](../scripts/migrar-sinais-wss.mjs)

O app agora identifica a sala de sinais **na própria URL do WebSocket**, no handshake, em vez de mandar uma mensagem `subscribe` depois que a conexão abre.

```
wss://ws-signals.automagroup.cloud/ws?name=bac-bo-default&collection=bac_bo_english
```

---

## 1. Por que mudou

No formato antigo o app conectava em `/ws` puro e só depois enviava `{"type":"subscribe","name":...,"collection":...}`. Entre o `onopen` e o servidor processar esse subscribe existe uma janela — e o servidor **usa essa janela**. Capturando a conexão crua no formato antigo:

```
HTTP 101 (sem query string)
RX: {"type":"history","signals":[{ ... "collection": "baccarat_sports_club" ...}]}   <-- outra collection
RX: {"type":"subscribed","name":"bac-bo-default","collection":"bac_bo_english"}
RX: {"type":"history","signals":[{ ... "collection": "bac_bo_english" ...}]}
```

O primeiro `history` é de **outro jogo**. E o `handleWsMessage` ([\[id\].vue:905](../app/pages/jogo/[id].vue#L905)) chama `setSignalFromWsStatus` em cima de qualquer mensagem que chegar, sem filtrar por `name`/`collection` — ou seja, o usuário podia ver por alguns instantes o sinal de um jogo que não é o dele.

Com a query string o servidor assina a sala antes de mandar qualquer coisa, e o vazamento some. Mesma conexão, formato novo:

```
HTTP 101 path=/ws?name=bac-bo-default&collection=bac_bo_english
RX: {"type":"subscribed","name":"bac-bo-default","collection":"bac_bo_english"}
RX: {"type":"history","signals":[{ ... "collection": "bac_bo_english" ...}]}
```

---

## 2. O que mudou no código

Uma coisa só, em [app/pages/jogo/[id].vue](../app/pages/jogo/[id].vue). Nenhum arquivo de config de jogo foi tocado.

**Novo helper `buildSignalWsUrl`** ([linha 914](../app/pages/jogo/[id].vue#L914)) — injeta `name`/`collection` na URL preservando o que já estiver lá:

| Entrada | Saída |
|---|---|
| `.../ws` + `bac-bo-default` + `bac_bo_english` | `.../ws?name=bac-bo-default&collection=bac_bo_english` |
| `.../ws` + `default` + *(sem collection)* | `.../ws?name=default` |
| `.../ws?token=x` + `goodgame-futebol-brasileiro` + `futebol_brasileiro_sports_club` | `.../ws?token=x&name=goodgame-futebol-brasileiro&collection=...` |

**Em `connectSignalWs`** ([linha 966](../app/pages/jogo/[id].vue#L966)) a URL passa pelo helper logo depois da normalização `ws://` → `wss://`.

**O `subscribe` no `onopen` continua lá** ([linha 970](../app/pages/jogo/[id].vue#L970)), de propósito. Se algum dia a API de config devolver a URL de um servidor que só assina por mensagem, o app não quebra. É idempotente: no servidor atual ele gera um segundo `subscribed` com payload idêntico ao primeiro, sem mudar estado. Se você quiser tirar, tire só depois de confirmar que **todos** os servidores em uso aceitam query string.

---

## 3. De onde vêm `name` e `collection`

Não são hardcoded na página. A cadeia é:

1. `getGameRouteConfig(gameId).signalRef` em [app/constants/gameRoutes.ts](../app/constants/gameRoutes.ts) — o `{ collection, name }` de cada jogo, e opcionalmente uma `url` própria.
2. `fetchGameConfig` em [app/composables/useGame.ts](../app/composables/useGame.ts) consulta `GET https://api-apps-server.automagroup.com.br/api/game-config/{collection}/{name}` e usa o `sinais_wss` de lá se vier completo.
3. Se a API falhar ou vier sem `sinais_wss`, cai no fallback embutido do `signalRef` + `DEFAULT_SIGNAL_URL` (`wss://ws-signals.automagroup.cloud/ws`).

Como a URL é montada no ponto de conexão, **os dois caminhos ganham a query string** — inclusive uma URL que venha da API.

> ⚠️ **No dia 08/09/2026 a API de config estava respondendo 521 (Cloudflare, origem fora do ar) em todas as rotas, inclusive na raiz.** Todos os 9 jogos estavam rodando pelo fallback embutido. Isso não quebra nada — o fallback cobre — mas significa que qualquer ajuste feito só no MongoDB de sinais não está chegando no app. Vale checar com quem cuida do `api-apps-server`.

---

## 4. Como verificar

```bash
node scripts/migrar-sinais-wss.mjs             # todos os jogos
node scripts/migrar-sinais-wss.mjs bac-bo-en   # um jogo só
```

O script resolve a config de cada jogo **do mesmo jeito que o app** (API primeiro, fallback depois), monta a URL nova, conecta e espera o `subscribed` — **sem mandar mensagem nenhuma**, o que prova que a query string sozinha resolve. Ele confere ainda se o `name`/`collection` que o servidor devolveu bate com o que foi pedido. Exit code 1 se algum jogo falhar, então serve em CI.

Resultado da rodada de 08/09/2026 — **9 de 9 jogos OK**:

| Jogo | collection / name |
|---|---|
| bac-bo | `bac_bo_english` / `bac-bo-ao-vivo-default` |
| bac-bo-en | `bac_bo_english` / `bac-bo-default` |
| bac-bo-brasileiro | `bac_bo_ao_vivo` / `bac-bo-ao-vivo-default` |
| bac-bo-sem-gale | `bac_bo_sem_gale` / `bac-bo-sem-gale` |
| football-studio | `football_studio_english` / `football-studio-eng-default` |
| futebol-brasileiro-sports-club | `futebol_brasileiro_sports_club` / `goodgame-futebol-brasileiro` |
| dragon-tiger | `dragon_tiger_evolution` / `default` |
| aviator | `aviator_spribe` / `aviator-spribe-default` |
| baccarat | `baccarat` / `default` |

O script importa o `gameRoutes.ts` direto (type stripping nativo do Node, sem flag a partir do 23.6), então **jogo novo entra na verificação sozinho** — não precisa manter lista duplicada.

### Na pipeline

O job `verificar-sinais` em [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) roda isso
a cada push na `main`, **antes** do deploy, no runner do GitHub. Sai `continue-on-error: true` de
propósito — o script depende de servidor de terceiro, e uma queda do `ws-signals` não pode segurar
um deploy que nem mexe em sinais. Quando falha, vira **warning** no run e o log completo vai pro
**Summary**; o deploy segue.

Se um dia quiser que a falha realmente trave o deploy, é só tirar o `continue-on-error` — mas leia a
última linha da seção 6 antes.

---

## 5. Replicando nos outros apps

A mudança é pequena e não depende de nada específico deste app. Em qualquer app que fale com o `ws-signals`:

1. Ache onde o `new WebSocket(...)` é criado e onde o `{"type":"subscribe"}` é enviado.
2. Copie o `buildSignalWsUrl` e aplique na URL **antes** do `new WebSocket`.
3. Mantenha o `subscribe` do `onopen` (ver seção 2).
4. Copie o script e rode contra o `gameRoutes` do app — se a lista de jogos for diferente, ele se ajusta sozinho porque lê do próprio arquivo.

O que **não** transfere: os caminhos dos arquivos e o `SIGNAL_API_BASE`, que muda por marca. Confira os dois antes de copiar.

---

## 6. Armadilhas

| Armadilha | O que acontece |
|---|---|
| Concatenar `?name=...` na mão em vez de usar `URL` | Quebra se a URL da API já tiver query string (`?token=...`) — vira `?token=x?name=y`. O helper usa `searchParams`, que resolve isso. |
| Tirar o `subscribe` do `onopen` sem checar | Se a API de config apontar para um servidor que só assina por mensagem, o app conecta e nunca recebe sinal — e falha em silêncio, porque o socket fica aberto. |
| Assumir que o `history` inicial é do jogo certo | Era exatamente esse o bug. Com a query string está resolvido, mas se um dia alguém voltar a conectar sem params, o vazamento volta. Um filtro por `name`/`collection` no `handleWsMessage` seria o cinto de segurança — ainda não existe. |
| Rodar o script e ver `config via fallback (API 521)` | Não é falha do WebSocket. É a API de config fora do ar (seção 3). O jogo continua funcionando. |
| Tornar o job da pipeline bloqueante | O script fala com servidor de terceiro. Bloqueante, ele transforma qualquer instabilidade do `ws-signals` em deploy travado — inclusive num hotfix urgente que não tem nada a ver com sinais. |
