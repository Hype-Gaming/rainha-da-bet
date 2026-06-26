# Apontar o app da Rainha para o novo banco (`rainha_da_bet`)

Passo a passo pra fazer o app da Rainha enxergar o seed que já foi gravado no
MongoDB novo (`104.131.7.171`, banco `rainha_da_bet`: 33 pagos + 117 free = 150).

> O seed **já está no banco**. Estes passos são só pra apontar o app pra ele e reiniciar.

---

## 0. Dados que você vai usar

| Item | Valor |
|---|---|
| Host Mongo | `104.131.7.171:27017` |
| Banco | `rainha_da_bet` |
| Connection string (app) | `mongodb://rainha_user:<SENHA_RAINHA_USER>@104.131.7.171:27017/rainha_da_bet?authSource=rainha_da_bet` |

> Se o usuário `rainha_user` ainda **não existir** nesse Mongo, use temporariamente a URI de
> admin (`mongodb://admin:<SENHA_ADMIN>@104.131.7.171:27017/rainha_da_bet?authSource=admin`)
> ou crie o usuário — veja a seção "Opcional" no fim.

---

## 1. Entrar na VPS e na pasta do projeto da rainha

```bash
ssh root@SEU_IP_DA_VPS
cd /var/www/CAMINHO_DO_PROJETO_RAINHA      # ajuste pro caminho real
```

Se não souber o caminho, ache pelo PM2:

```bash
pm2 list                 # veja o nome do processo da rainha
pm2 info NOME_DO_PROCESSO | grep "exec cwd"
```

---

## 2. Ver o que está no `.env` hoje

```bash
grep MONGODB_URI .env
```

Provavelmente vai estar vazio, apontando pro banco antigo, ou com outro nome de DB.

---

## 3. Corrigir a linha do `MONGODB_URI`

```bash
nano .env
```

Deixe **exatamente** esta linha (apague qualquer outra `MONGODB_URI`):

```
MONGODB_URI=mongodb://rainha_user:<SENHA_RAINHA_USER>@104.131.7.171:27017/rainha_da_bet?authSource=rainha_da_bet
```

Salvar no nano: `Ctrl+O`, `Enter`, depois `Ctrl+X`.

> **Nome do banco no código (importante!).** O `server/utils/mongodb.ts` usa
> `db = client.db(DB_NAME)`, e esse `DB_NAME` **tem prioridade sobre** o nome de banco
> que estiver na connection string. Antes, ele era `'rainha-da-bet'` (com **hífen**) fixo —
> ou seja, mesmo com a URI apontando pra `rainha_da_bet`, o app conectava no banco errado.
>
> O código foi corrigido para:
> ```ts
> const DB_NAME = process.env.MONGO_DB_NAME || 'rainha_da_bet'
> ```
> Agora o default já é `rainha_da_bet` (underscore), e dá pra sobrescrever via `.env`
> com `MONGO_DB_NAME=`. Como isso é mudança de **código**, é preciso **rebuildar uma vez**
> (passo 5) e fazer deploy dessa versão na VPS.

---

## 4. Reiniciar o PM2 relendo o ambiente

```bash
pm2 restart NOME_DO_PROCESSO --update-env
```

> O `--update-env` é obrigatório — sem ele o PM2 mantém o ambiente velho em cache.

Confirme que a variável entrou no processo:

```bash
pm2 list                                   # pega o id do processo da rainha
pm2 env ID_DO_PROCESSO | grep MONGODB_URI   # tem que mostrar .../rainha_da_bet
```

Se `pm2 env` **não** mostrar a variável, o `ecosystem.config.cjs` não recarregou.
Suba do zero lendo o ecosystem:

```bash
pm2 delete NOME_DO_PROCESSO
pm2 start ecosystem.config.cjs
pm2 env ID_DO_PROCESSO | grep MONGODB_URI
```

---

## 5. Rebuildar (obrigatório nesta troca de banco)

A correção do `DB_NAME` (de `rainha-da-bet` para `rainha_da_bet`) é mudança de código,
então **precisa** rebuildar o `.output` e subir essa versão:

```bash
git pull            # traz a correção do server/utils/mongodb.ts
npm run build
pm2 restart NOME_DO_PROCESSO --update-env
```

> Daqui pra frente, se só mexer no `.env` (URI ou `MONGO_DB_NAME`), **não** precisa
> rebuildar — basta o passo 4 com `--update-env`.

---

## 6. Conferir os logs

```bash
pm2 flush NOME_DO_PROCESSO        # limpa logs antigos pra não confundir
pm2 logs NOME_DO_PROCESSO --lines 30
```

O que você quer ver:

- ✅ **Sem** `MongoServerSelectionError` / `timed out` / IP do banco antigo.
- ✅ Scheduler/ticks rodando sem erro.

---

## 7. Testar no painel

Abra o painel admin da rainha no navegador → **Stats**. Deve mostrar:

- **Total de usuários: 150**
- **Assinantes ativos: 33**

---

## Checklist rápido

- [ ] `.env` com `MONGODB_URI=...rainha_da_bet?authSource=rainha_da_bet`
- [ ] Código com `DB_NAME = process.env.MONGO_DB_NAME || 'rainha_da_bet'` (já corrigido)
- [ ] `npm run build` (obrigatório nesta troca — mudança de código)
- [ ] `pm2 restart ... --update-env` (ou `delete` + `start ecosystem.config.cjs`)
- [ ] `pm2 env` mostra a URI nova
- [ ] `pm2 logs` sem erro de conexão
- [ ] Painel mostra 150 / 33

---

## Opcional — criar o usuário `rainha_user` no Mongo

Se a connection string com `rainha_user` der erro de autenticação, o usuário não existe.
Crie com as credenciais de admin:

```bash
mongosh "mongodb://admin:<SENHA_ADMIN>@104.131.7.171:27017/admin?authSource=admin"
```

```javascript
use rainha_da_bet
db.createUser({
  user: "rainha_user",
  pwd: "<SENHA_RAINHA_USER>",
  roles: [ { role: "readWrite", db: "rainha_da_bet" } ]
})
```

> No `mongosh` a senha vai **sem URL-encode**. No `.env` ela vai **URL-encoded**
> (ex.: `!` vira `%21`, `@` vira `%40`). Use a senha real só localmente, nunca no repositório.

Depois volte ao passo 4.
