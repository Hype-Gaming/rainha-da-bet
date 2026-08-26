# Erros e avisos ao usuário — inventário

Todo ponto em que o app fala com o usuário sobre falha, bloqueio ou pendência.
Serve de referência para replicar o padrão em outros apps do stack.

Levantado em 2026-08-19 lendo o código, não de memória. Ao portar, confira se as
linhas ainda batem.

---

## 1. Os quatro formatos, e quando usar cada um

A escolha do formato não é estética — ela diz quanta ação o usuário precisa tomar.

| Formato | Quando | Bloqueia a tela? |
|---|---|---|
| **Página inteira** | o app todo está indisponível | sim, substitui tudo |
| **Placeholder inline** | uma área falhou, o resto da tela funciona | não |
| **Modal (pop-up)** | o usuário precisa decidir ou agir para sair do estado | sim, com backdrop |
| **Toast** | informação passageira, sem ação | não, some sozinho |

A regra que vale a pena carregar para os outros projetos: **modal só quando existe
um próximo passo.** Modal sem ação vira obstáculo — o usuário fecha e continua
sem saber o que fazer. E o oposto também: erro com beco sem saída não deve ficar
só no inline, porque o usuário não descobre a saída sozinho e vai para o WhatsApp.

---

## 2. Página inteira

### Manutenção
- **Onde:** [app.vue:11](../app/app/app.vue#L11) → [MaintenancePage.vue](../app/app/components/MaintenancePage.vue)
- **Gatilho:** `maintenance.active` do slug (`useSlugTheme`), vindo de `GET /api/settings/maintenance`
- **Comportamento:** substitui o `<NuxtPage>` inteiro; título e mensagem vêm do painel
- **Efeito colateral:** derruba junto o drawer de depósito, a barra "voltar ao jogo" e os toasts

---

## 3. Placeholders inline

### Catálogo da home não carregou
- **Onde:** [index.vue:44](../app/app/pages/[[slug]]/index.vue#L44)
- **Gatilho:** `loadError` — o `catch` do `loadContent()` (falha em `/api/games` ou `/api/premium-access`)
- **Ação:** botão "Tentar novamente" chamando `loadContent`

### Sessão expirada na página do jogo
- **Onde:** [\[id\].vue:744](../app/app/pages/[[slug]]/jogo/[id].vue#L744)
- **Gatilho:** `needsLogin` — HTTP 401 no `start-game`, ou usuário não autenticado
- **Ação:** link para `/auth/login`
- **Nota:** é o único caso em que o app manda para o login sem modal — o estado é
  autoexplicativo e a ação é única

### Erro ao carregar o jogo
- **Onde:** [\[id\].vue:752](../app/app/pages/[[slug]]/jogo/[id].vue#L752)
- **Gatilho:** `gameError` preenchido
- **Ação:** "Tentar novamente" chamando `loadGame`
- **Nota:** desde 2026-08-19 este placeholder **acompanha** o modal de recusa (item 4),
  não substitui. Ele é o fundo; o modal é quem dá a saída.

---

## 4. Modais

### 4.1 Suporte / Checkout — home
- **Onde:** [index.vue:80](../app/app/pages/[[slug]]/index.vue#L80)
- **Estado:** `modal === 'support'` + `supportSource`
- **Duas faces, mesmo modal:**
  - `supportSource === 'iaPremium'` → **"LIBERE O IA PREMIUM"**, botão para o checkout Lastlink
  - qualquer outro → **"PRECISA LIBERAR SEU ACESSO?"**, botão de WhatsApp
- **Gatilhos:** clique em card sem permissão (`openGame`, `openElite`); e uma vez por
  sessão na primeira visita (`jheffy-support-shown`)
- **Por que duas faces:** trocar o CTA direto mandaria também quem clicou em LIVE/PRIME
  para uma página de pagamento. A origem do clique decide o texto.
- **Fallback:** sem `whatsappSupport` no slug, o botão vira "SUPORTE EM CONFIGURAÇÃO", desabilitado

### 4.2 Notificações — home
- **Onde:** [index.vue:84](../app/app/pages/[[slug]]/index.vue#L84)
- **Estado:** `modal === 'notifications'`
- **Gatilho:** `notificationDue()` — só se o push é suportado, a permissão está em
  `default`, e o usuário não adiou nos últimos 7 dias (`jheffy-push-deferred-at`)
- **Ações:** "ATIVAR NOTIFICAÇÕES" / "AGORA NÃO"
- **Nota:** não é erro, é pedido de permissão — mas divide a fila de modais com os
  outros, por isso está aqui. Nunca aparece junto com o de suporte.

### 4.3 Verificação necessária (KYC) — jogo
- **Onde:** [\[id\].vue:801](../app/app/pages/[[slug]]/jogo/[id].vue#L801)
- **Estado:** `showKycModal`
- **Gatilho:** `KYC_REQUIRED` — detectado em dois lugares no servidor:
  1. `kyc_validated_at` vazio no perfil ([start-game.get.ts:53](../app/server/api/routes/start-game.get.ts#L53))
  2. heurística sobre o texto da recusa (`hasKycError`)
- **Ações:** "Abrir minha conta" (`customLinks.site` ou `registerUrl`) / "Agora não"
- **Por que a checagem dupla:** alguns provedores devolvem só `error: true` no
  start-game, sem motivo. O perfil é a fonte confiável.

### 4.4 Não foi possível abrir o jogo — jogo
- **Onde:** [\[id\].vue:839](../app/app/pages/[[slug]]/jogo/[id].vue#L839)
- **Estado:** `showGameErrorModal`
- **Gatilho:** `START_GAME_REJECTED` — qualquer recusa que não seja 401 nem KYC
- **Ações:** "Tentar novamente" (`retryFromModal`) / "Falar com o suporte" (`whatsappSupport`)
- **Fallback:** sem `whatsappSupport`, o segundo botão vira "Fechar"
- **Aberto:** o texto lista causas prováveis porque a API não informa o motivo real.
  A instrumentação do item 7 existe para fechar isso.

### 4.5 Conta bloqueada — login
- **Onde:** [login/index.vue:108](../app/app/pages/[[slug]]/auth/login/index.vue#L108)
- **Estado:** `showBlockedModal`
- **Dois gatilhos:**
  - `?reason=blocked` — usuário ativo derrubado pelo heartbeat ([useUserEngagement.ts:61](../app/app/composables/useUserEngagement.ts#L61))
  - resposta de login com `data.blocked === true` ([login.post.ts:73](../app/server/api/session/login.post.ts#L73))
- **Ação:** botão de suporte; sem link configurado, texto "Entre em contato com o suporte"
- **Extra:** aceita imagem própria por slug (`slugData.blockedImage`)

### 4.6 Instalar o app (PWA)
- **Onde:** [PwaInstallBanner.vue](../app/app/components/PwaInstallBanner.vue)
- **Não é modal**, é banner — mas ocupa espaço e concorre com os modais
- **Dispensa persistida em** `localStorage['pwa-install-dismissed']`

---

## 5. Alertas na tela de login

Faixas dentro do formulário, não modais.

| Gatilho | Texto | Origem |
|---|---|---|
| `?reason=session_expired` | "Sua sessao expirou. Faca login novamente." | [useUserBalance.ts:43](../app/app/composables/useUserBalance.ts#L43) |
| 401 / credenciais | "E-mail ou senha incorretos" | [login/index.vue:281](../app/app/pages/[[slug]]/auth/login/index.vue#L281) |
| 429 | "Muitas tentativas. Aguarde um momento." | idem |
| `AUTH_PROVIDER_UNAVAILABLE` | "O servico de autenticacao esta indisponivel. Aguarde dois minutos e tente novamente." | [login.post.ts:121](../app/server/api/session/login.post.ts#L121) |
| resto | "Erro ao conectar. Tente novamente." | idem |

### Falha conhecida — `wrong_tenant` sem mensagem

[auth-session.global.ts:34](../app/app/middleware/auth-session.global.ts#L34) redireciona
para `?reason=wrong_tenant` quando a sessão pertence a outro slug. **Não existe alerta
para esse `reason`** — o usuário é expulso para o login sem explicação nenhuma.

Ao portar para outro app, ou trate esse caso, ou remova o parâmetro. Do jeito que
está, é uma expulsão silenciosa.

---

## 6. Toasts

[AppInAppToast.vue](../app/app/components/AppInAppToast.vue) — fila com `aria-live="polite"`,
some sozinho. Uso: avisos de sinal/entrada, não erro.

Há também um `copyToast` local na página do jogo, para "copiado".

---

## 7. Códigos de erro do servidor

Contrato entre o servidor Nitro e o front. O front decide o formato pelo código,
não pela mensagem — mensagem muda, código não.

| Código | HTTP | Onde nasce | O que o front faz |
|---|---|---|---|
| `KYC_REQUIRED` | 403 | [start-game.get.ts:57](../app/server/api/routes/start-game.get.ts#L57) e :102 | modal 4.3 |
| `START_GAME_REJECTED` | 4xx/502 | [start-game.get.ts:111](../app/server/api/routes/start-game.get.ts#L111) | modal 4.4 |
| `AUTH_PROVIDER_UNAVAILABLE` | 503 | [login.post.ts:121](../app/server/api/session/login.post.ts#L121) | alerta no login |
| (401) | 401 | qualquer rota `/api/routes/*` | placeholder de sessão expirada |
| `blocked: true` | 403 | [login.post.ts:73](../app/server/api/session/login.post.ts#L73) | modal 4.5 |

### Diagnóstico das recusas

A mensagem que o usuário vê é genérica **de propósito** — o corpo do provedor pode
conter dados da conta dele e não é texto de interface. O motivo real vai para o log
do servidor, em [start-game.get.ts](../app/server/api/routes/start-game.get.ts):

```
[start-game] recusado {"email":"...","gameSlug":"...","status":403,
"reason":"START_GAME_REJECTED","upstream":"{...}"}
```

```bash
pm2 logs --lines 200 --nostream | grep "start-game"
```

O e-mail vai junto para cruzar com a reclamação do usuário. Os headers de auth
(`Bearer` e `X-Cactus-Cookie-Key`) **nunca** entram no log — seria vazar a sessão
dele em texto puro. O corpo do provedor é cortado em 2000 caracteres porque alguns
devolvem uma página HTML inteira.

---

## 8. Regras de ouro ao replicar

1. **Modal só com próximo passo.** Sem ação, use inline ou toast.
2. **Todo botão que depende de config do slug precisa de fallback.** Sem
   `whatsappSupport`, o botão tem que virar outra coisa — nunca um link vazio.
3. **Erro genérico para o usuário, específico para o log.** Nunca jogue o corpo do
   provedor na tela, e nunca o descarte no servidor.
4. **Um modal por vez.** A home encadeia por `closeSupport()`; sobrepor dois backdrops
   trava o usuário.
5. **Nunca logue header de autenticação.**
6. **Todo `?reason=` precisa de mensagem correspondente** — ver a falha do item 5.
