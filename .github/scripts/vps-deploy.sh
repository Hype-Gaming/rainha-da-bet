#!/usr/bin/env bash
#
# vps-deploy.sh — executado NA VPS via "ssh ... 'bash -s' < este-arquivo"
# pelo workflow .github/workflows/deploy.yml.
#
# Faz: git fetch + reset --hard origin/main -> npm ci -> npm run build ->
# pm2 reload -> pm2 save -> healthcheck na porta local.
#
# O .env e o node_modules NÃO são tocados (gitignored / preservados).
# ----------------------------------------------------------------------------
set -euo pipefail

# ===== Config do app (ajuste 1x por repositório) =====
APP_DIR="/var/www/rainhaclub/rainha-da-bet"
PM2_NAME="aplicativo-rainha-da-bet"
PORT_LOCAL=3098
BRANCH="main"
# =====================================================

echo "==> cd $APP_DIR"
cd "$APP_DIR" || { echo "ERRO: $APP_DIR não existe (faça o setup git uma vez)"; exit 1; }

if [ ! -d .git ]; then
  echo "ERRO: $APP_DIR não é um repositório git. Veja o setup no DEPLOY-README.md."
  exit 1
fi

echo "==> git fetch + reset --hard origin/$BRANCH"
git fetch --prune origin
git reset --hard "origin/$BRANCH"

echo "==> Instalando dependências"
if [ -f package-lock.json ]; then npm ci; else npm install; fi

echo "==> Build"
npm run build

echo "==> Reload do PM2"
if [ -f ecosystem.config.cjs ]; then
  pm2 startOrReload ecosystem.config.cjs --update-env
else
  pm2 restart "$PM2_NAME" --update-env
fi
pm2 save

echo "==> Healthcheck em localhost:$PORT_LOCAL"
for _ in $(seq 1 20); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$PORT_LOCAL" 2>/dev/null || echo 000)"
  if [ "$code" != "000" ]; then
    echo "OK: localhost:$PORT_LOCAL respondeu HTTP $code"
    exit 0
  fi
  sleep 2
done

echo "ERRO: app não respondeu em localhost:$PORT_LOCAL após 40s"
pm2 logs "$PM2_NAME" --lines 50 --nostream || true
exit 1
