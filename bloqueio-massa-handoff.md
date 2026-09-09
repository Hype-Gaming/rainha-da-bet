# Bloqueio em massa por lista de e-mails — Handoff para replicar (Rainha, Luisa, Irmandade)

Como levar o bloqueio/desbloqueio em massa do painel do Jheffy para os outros apps.

**Leia a seção 1 antes de copiar qualquer arquivo.** Os apps não compartilham a mesma stack: o Jheffy é Fastify com `UserActivity` chaveado por `{slug, email}`; Irmandade/Rainha/Luisa são Nuxt com `app_users` chaveado por `email`. O desenho transfere inteiro, o código não.

Complementa o [painel-admin-handoff.md](painel-admin-handoff.md).

---

## 1. O que muda de app para app

| | **Jheffy** (origem) | **Irmandade / Rainha / Luisa** |
|---|---|---|
| Stack da API | Fastify, `api/src/routes/*` | Nuxt 4, `server/api/admin/*` |
| Coleção | `UserActivity` | `app_users` |
| Chave única | `{ slug, email }` — **uma linha por slug** | `email` — uma linha por pessoa |
| Campos | `blocked`, `blockedAt` | `blocked`, `blocked_at` |
| Auth admin | JWT (`requireAdmin` global) | cookie de sessão (`requireAdminSession`) |
| Painel | HTML único em `api/public/dashboard.html` | `app/pages/admin/index.vue` |

> A coluna da direita descreve o **Irmandade**, conforme o [painel-admin-handoff.md](painel-admin-handoff.md). Rainha e Luisa entram aqui na medida em que já foram replicados a partir dele — confirme a coleção e os nomes dos campos no app antes de começar, é a checagem de 30 segundos que evita reescrever a query inteira depois.

**A consequência prática:** no Jheffy um e-mail pode virar 2, 3 registros (um por slug), e por isso a API devolve `matchedEmails` e `matchedRows` separados. Nos outros apps, `matchedEmails === matchedRows` sempre. Você pode manter os dois campos (a UI já lida com o caso `1 → 1`) ou colapsar num só. **Recomendo manter os dois** — se algum dia um app ganhar múltiplas marcas, o contrato não muda.

---

## 2. As decisões de desenho (essas transferem 100%)

Foram decididas discutindo o caso de uso real. Se você mudar alguma, mude sabendo o que está trocando.

| Decisão | Por quê |
|---|---|
| **Colar lista de e-mails**, não checkbox na tabela | A lista vem de fora — planilha, suporte, WhatsApp. Checkbox só serve pra quem já está na tela. |
| **E-mail = pessoa**, o lote atinge todos os slugs | Se está banido, está banido na operação toda. |
| E-mail que não existe vira **"não encontrado"**, não cria registro | Criar registro preventivo exigiria um slug e poluiria as métricas de usuários/conversão com fantasmas. |
| **Duas rotas** (`/preview` e a de escrita), não um `dryRun: boolean` | O que separa "mostrar" de "escrever" tem que ser a URL, não um campo do corpo que pode chegar `undefined`. |
| A rota de escrita **reparsa a lista bruta** | Os dois endpoints são stateless. Se o apply confiasse na lista limpa que a prévia devolveu, qualquer cliente mandaria o que quisesse alegando que "a prévia aprovou". |
| `updateMany` filtrado por **`blocked: { $ne: alvo }`** | Ver a armadilha nº 2 na seção 6. Não pule isso. |
| Teto de **500 e-mails** por lote | Segura o `$in` e o tamanho da resposta. Ajuste se precisar, mas tenha um teto. |

---

## 3. Arquivos a copiar

```
api/src/lib/emailList.ts                          → copiar inteiro, serve em qualquer stack
api/src/lib/emailList.test.ts                     → copiar inteiro (só depende do helper)
api/src/routes/adminDashboard.ts                  → copiar o bloco das 2 rotas + readBulkList
api/src/routes/adminDashboard.bulkBlock.test.ts   → adaptar nomes de campo e fixture
api/public/dashboard.html                         → CSS .bb-*, markup do #bulk-modal, JS do bloco
```

O `emailList.ts` é o único arquivo que vai **sem tocar em nada** — é uma função pura, sem Mongo, sem Fastify.

---

## 4. O parser (`emailList.ts`)

Copie como está. Ele resolve os formatos que aparecem de verdade numa lista colada:

| Entrada colada | Vira |
|---|---|
| `a@x.com\nb@x.com, c@x.com; d@x.com` | 4 e-mails (quebra de linha, vírgula, `;`, espaço) |
| `"a@x.com";"b@x.com"` | 2 e-mails — **as aspas de CSV são removidas** |
| `<c@x.com>, <d@x.com>` | 2 e-mails — formato de cliente de e-mail |
| `"Joao Silva" <f@x.com>` | 1 e-mail + `Joao`, `Silva` reportados como inválidos |
| `Ana@X.com` / `ANA@x.com` | 1 e-mail (lowercase, dedupe) |
| `e@x.com.` / `(h@x.com)` | 1 e-mail (pontuação e parênteses removidos) |

O `unwrap()` existe por causa de um bug real: sem ele, `"a@x.com"` **passava** a validação de formato com as aspas e virava uma busca que nunca casava no banco. O lote reportava "não encontrado" pra gente que existe, sem erro nenhum na tela. É a falha mais fácil de não perceber nesse recurso inteiro.

---

## 5. Contrato das duas rotas

Mantenha os nomes dos campos — a UI depende deles.

### Prévia (só lê)

```
POST  <prefixo-admin>/users/bulk-block/preview
body  { emails: string }

200   {
        matched:  [{ email, name, slug, blocked, lastLoginAt }],
        notFound: string[],
        invalid:  string[],
        counts: { requested, matchedEmails, matchedRows, slugs, notFound, invalid }
      }
```

### Aplicação (escreve)

```
POST  <prefixo-admin>/users/bulk-block
body  { emails: string, blocked: boolean }

200   {
        blocked, requested, matchedEmails, matchedRows,
        modifiedCount,    // mudaram de estado de fato
        alreadyInState,   // já estavam assim — não foram tocados
        notFound: string[],
        invalid:  string[]
      }
```

### Erros

- **400** — lista vazia, nenhum e-mail com formato válido, acima de 500, ou `blocked` que não é booleano.
- **200 com relatório** — mesmo quando parte da lista não existe. **Não transforme isso em erro.** Numa lista vinda de fora, "não encontrado" é o caso normal, e é justamente o que o admin precisa ver.

Nenhuma autenticação nova: as rotas herdam a guarda admin que o app já tem.

---

## 6. As três armadilhas

Todas foram encontradas rodando o código, não lendo. Se você reimplementar do zero, vai cair nelas.

### 1. Aspas de planilha passam pela validação

`"a@x.com"` não tem espaço nem `@` sobrando, então uma regex de e-mail comum aceita. O token vira uma busca por um e-mail com aspas, que não existe. **Falha silenciosa.** Resolvido pelo `unwrap()` no parser.

### 2. `$set` cego apaga o "bloqueado desde quando"

Este é o pior. A versão ingênua:

```ts
updateMany({ email: { $in: emails } },
           { $set: { blocked, blockedAt: new Date() } })
```

Recolar a mesma planilha é *exatamente* o que se faz num fluxo em lote — e isso reescreve o `blockedAt` de todo mundo que já estava bloqueado. A data original de bloqueio some. A versão correta:

```ts
updateMany({ email: { $in: emails }, blocked: { $ne: alvo } },
           { $set: { blocked: alvo, blockedAt: alvo ? new Date() : null } })
```

Só toca em quem muda de estado. De brinde, a operação vira idempotente e o `modifiedCount` passa a ser um número honesto.

Como o filtro mudou, o total de registros atingidos deixa de vir do `updateMany`. Busque separado:

```ts
const [matchedRows, found] = await Promise.all([
  Model.countDocuments(filter),
  Model.distinct('email', filter),
])
```

### 3. Os números precisam fechar na tela

Se a prévia diz "4 registros" e o toast diz "3 bloqueados", parece bug. Por isso o `alreadyInState` existe e a UI mostra os três números juntos:

```
3 registros bloqueados · 1 já estava assim · 1 não encontrado
```

No Jheffy tem ainda o `matchedEmails` vs `matchedRows` (4 e-mails → 5 registros). Nos apps de marca única esse par sempre bate, mas mantenha os dois campos.

---

## 7. Frontend

O modal tem duas etapas no mesmo overlay: textarea → prévia → confirmar. Um `<select>` escolhe Bloquear/Desbloquear, e o ícone, o título e a cor do botão seguem essa escolha.

No Jheffy o código está em [api/public/dashboard.html](api/public/dashboard.html): CSS `.bb-*`, markup `#bulk-modal`, e o bloco JS `openBulkBlock` / `bbLoadPreview` / `bbApply`. Nos apps Nuxt, isso vira um componente Vue — o desenho é o mesmo, o código não se copia.

**Detalhe que morde:** e-mail e nome do usuário vão pra dentro de `innerHTML`. Escape HTML de verdade (`& < > " '`), não só aspas simples. No Jheffy isso é o `bbHtml()`; em Vue a interpolação `{{ }}` já resolve, mas `v-html` não.

---

## 8. Testes

`node:test`, **sem dependência nova**. 29 testes: 11 do parser (sem banco) e 18 das rotas (contra Mongo real).

```json
"test":            "tsx --test \"src/**/*.test.ts\"",
"test:db":         "cross-env MONGO_TEST_URI=mongodb://127.0.0.1:27018/jheffy-test npm test",
"test:mongo:up":   "docker run -d --rm --name jheffy-test-mongo -p 27018:27017 mongo:7",
"test:mongo:down": "docker rm -f jheffy-test-mongo"
```

Sem `MONGO_TEST_URI` a suíte de banco é pulada com a razão impressa, então `npm test` roda em qualquer máquina.

> ⚠️ Os testes de banco rodam `deleteMany({})` na coleção. `MONGO_TEST_URI` **tem que** apontar pra um banco descartável. O `test:mongo:up` existe pra ninguém improvisar essa URI e acertar produção.

Excluir os testes do build, senão vão parar no `dist/`:

```json
"exclude": ["node_modules", "dist", "src/**/*.test.ts"]
```

Os casos que valem a pena replicar em qualquer app:

- prévia **não escreve nada** no banco
- `modifiedCount` conta só quem mudou de estado
- **`blockedAt` original preservado** quando a lista é recolada
- reaplicar a mesma lista → `modifiedCount: 0`
- e-mail inexistente **não cria** registro
- desbloqueio zera o `blockedAt`
- quem está fora da lista não é afetado
- os 400 de validação **não escrevem** no banco

---

## 9. Checklist de replicação

- [ ] Copiar `emailList.ts` + `emailList.test.ts` (vão sem alteração)
- [ ] Confirmar os nomes dos campos no app alvo (`blockedAt` vs `blocked_at`) e a coleção
- [ ] Portar as duas rotas para a stack do app, mantendo os nomes do contrato da seção 5
- [ ] Usar `blocked: { $ne: alvo }` no update — armadilha nº 2
- [ ] Buscar `matchedRows` / `found` separado do `updateMany`
- [ ] Montar o modal de duas etapas; escapar HTML de nome e e-mail
- [ ] Mostrar os três números no resultado (`modificados · já estavam · não encontrados`)
- [ ] Adaptar os testes de rota (nomes de campo + fixture) e rodar contra Mongo descartável
- [ ] Excluir `*.test.ts` do build
- [ ] Testar na UI com **um e-mail seu** e ação "Desbloquear" antes de usar pra valer — é idempotente em quem já está ativo, então não quebra nada

---

## 10. Estado no Jheffy

Implementado e verificado: 29 testes automatizados passando e o fluxo dirigido no Chrome contra um Mongo descartável (login → colar lista suja → prévia → aplicar), com o efeito confirmado no banco.

Arquivos:

- [api/src/lib/emailList.ts](api/src/lib/emailList.ts)
- [api/src/lib/emailList.test.ts](api/src/lib/emailList.test.ts)
- [api/src/routes/adminDashboard.ts](api/src/routes/adminDashboard.ts) — `readBulkList` + as duas rotas
- [api/src/routes/adminDashboard.bulkBlock.test.ts](api/src/routes/adminDashboard.bulkBlock.test.ts)
- [api/public/dashboard.html](api/public/dashboard.html) — CSS `.bb-*`, `#bulk-modal`, bloco JS
