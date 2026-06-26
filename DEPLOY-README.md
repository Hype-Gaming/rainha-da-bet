# Deploy automatizado na VPS — `deploy-app.sh`

Scripts de deploy seguro para os apps Node/Nuxt (Nitro) rodando com PM2 + NGINX + Certbot.

- `deploy-app.sh` — deploy completo de um app a partir de um ZIP/pasta.
- `deploy-file.sh` — deploy de **um arquivo** específico (hotfix rápido).

## Apps configurados

| chave       | PM2                          | porta | domínio                       | ecosystem |
|-------------|------------------------------|-------|-------------------------------|-----------|
| `rainha`    | `aplicativo-rainha-da-bet`   | 3098  | https://app.rainhaclub.com    | sim       |
| `irmandade` | `irmandade`                  | 3099  | https://app.irmandadebacbo.com| sim       |
| `baccarat`  | `baccaratlegacy`             | 3100  | https://app.baccaratlegacy.com| não       |
| `luisa`     | `luisaaviator-front`         | 3012  | https://app.luisaaviator.com  | não       |
| `flowup`    | `flowup`                     | 3014  | https://app.hypeflowup.com    | não       |
| `elder`     | `elder-aviator-front` (3101) + `elder-aviator-api` (3399) | — | https://app.aviatorprime.com | não |

> **Elder:** o NGINX deve mandar **tudo** para o frontend Nitro na porta **3101** (inclusive `/api/*`).
> Não pode existir `location /api/` apontando para `3399` — as rotas `/api/start-game`, `/api/leaderboard`,
> `/api/register`, `/api/auth/login` e `/api/deposit` vivem no Nitro. O script valida isso ao final.

## Instalação na VPS

```bash
# 1) Suba os scripts (via SFTP/Termius) para, por exemplo:
mkdir -p ~/deploy
# copie deploy-app.sh e deploy-file.sh para ~/deploy

# 2) Corrija quebras de linha (caso tenha vindo do Windows) e dê permissão
sudo apt-get install -y dos2unix   # se ainda não tiver
dos2unix ~/deploy/deploy-app.sh ~/deploy/deploy-file.sh
chmod +x ~/deploy/deploy-app.sh ~/deploy/deploy-file.sh

# 3) (opcional) deixe acessível de qualquer lugar
sudo ln -sf ~/deploy/deploy-app.sh /usr/local/bin/deploy-app
```

> Rode com o **mesmo usuário dono das pastas em `/var/www`**. Se os arquivos forem do `www-data`,
> ajuste o dono (`sudo chown -R $USER:$USER /var/www/<projeto>`) ou rode o script com `sudo`.
> Requisitos: `rsync`, `unzip` (ou `tar`), `npm`, `pm2`, `curl`, `ss` (`iproute2`).

## Uso — deploy completo

```bash
# básico (preserva .env e ecosystem atuais)
./deploy-app.sh rainha    /root/uploads/rainha.zip
./deploy-app.sh irmandade /root/uploads/irmandade.zip

# substituindo o .env e/ou o ecosystem que vieram no pacote
./deploy-app.sh rainha /root/uploads/rainha.zip --replace-env
./deploy-app.sh rainha /root/uploads/rainha.zip --replace-env --replace-ecosystem

# sem rebuild (só troca arquivos e reinicia), ou sem testar domínio
./deploy-app.sh flowup /root/uploads/flowup.zip --no-build
./deploy-app.sh luisa  /root/uploads/luisa.zip  --skip-domain

# não-interativo (CI/cron) e mantendo só 3 backups
./deploy-app.sh elder /root/uploads/elder.zip --yes --keep-backups 3

# a "origem" também pode ser uma PASTA já extraída
./deploy-app.sh baccarat /root/uploads/baccarat-build/
```

### O que ele faz, em ordem
1. Valida o pacote (`.zip`, `.tar.gz` ou pasta).
2. Limpa/recria a pasta temporária do app e extrai.
3. Detecta o `package.json` (ignora `node_modules`; se houver vários, escolhe o mais raso ou pergunta).
4. Backup da versão atual em `…-backup-<data>` (via `rsync`, sem `node_modules`/`.git`).
5. Backup separado do `.env` de cada serviço (`.env.bak-<data>`).
6. `rsync --delete` preservando `node_modules .output .nuxt dist .git` e, por padrão, `.env` e `ecosystem.config.cjs`.
7. Mostra `.env` e `ecosystem` **com valores sensíveis mascarados**.
8. `npm install` + `npm run build` (build só roda se existir o script e o serviço pedir).
9. Reinicia PM2 (`startOrReload` no ecosystem, ou `pm2 restart <nome>`).
10. `pm2 save`.
11. Testa `http://localhost:<porta>` (com retry) e `https://<dominio>`.
12. Elder: valida `/api/health` (3399) e `/api/start-game` pelo domínio.
13. Em erro: mostra `pm2 logs`, quem ocupa a porta, **mantém o backup** e imprime o rollback.

## Uso — deploy de um arquivo (hotfix)

```bash
./deploy-file.sh rainha ./app/pages/index.vue app/pages/index.vue --build --restart
./deploy-file.sh irmandade ./server/api/webhook.post.ts server/api/webhook.post.ts --restart
```

Faz backup do arquivo atual (`arquivo.bak-<data>`), copia, e — se pedido — roda build e reinicia o PM2.

## Checklist de rollback (manual)

O backup fica como **irmão** da pasta do projeto: `…-backup-<data>`.

```bash
# 1) parar o app
pm2 stop <nome-pm2>

# 2) preservar a versão quebrada (não apagar ainda)
mv /var/www/<grupo>/<projeto>            /var/www/<grupo>/<projeto>-FALHOU-<data>

# 3) restaurar o backup
mv /var/www/<grupo>/<projeto>-backup-<data>   /var/www/<grupo>/<projeto>

# 4) dependências (node_modules não vai no backup) e subir
cd /var/www/<grupo>/<projeto>
npm install
# com ecosystem (rainha/irmandade):
pm2 start ecosystem.config.cjs --update-env
# sem ecosystem (baccarat/luisa/flowup/elder):
pm2 restart <nome-pm2> --update-env
pm2 save

# 5) validar
curl -I http://localhost:<porta>
curl -I https://<dominio>
```

Exemplo concreto — Rainha da Bet:

```bash
pm2 stop aplicativo-rainha-da-bet
mv /var/www/rainhaclub/rainha-da-bet /var/www/rainhaclub/rainha-da-bet-FALHOU-2026-06-16
mv /var/www/rainhaclub/rainha-da-bet-backup-2026-06-16-1530 /var/www/rainhaclub/rainha-da-bet
cd /var/www/rainhaclub/rainha-da-bet && npm install
pm2 start ecosystem.config.cjs --update-env && pm2 save
curl -I http://localhost:3098 && curl -I https://app.rainhaclub.com
```

> O `.env` antigo também fica salvo como `.env.bak-<data>` dentro da pasta do projeto, caso precise restaurar só ele.

## Diagnóstico de porta ocupada

```bash
ss -ltnp | grep :3098
sudo lsof -i :3098
```
