#!/usr/bin/env bash
#
# deploy-file.sh — Deploy de UM arquivo específico para um app na VPS
# ----------------------------------------------------------------------------
# Uso:
#   ./deploy-file.sh <app> <arquivo-local> <destino-relativo-no-projeto> [opções]
#
# Exemplos:
#   ./deploy-file.sh rainha ./app/pages/index.vue app/pages/index.vue --build --restart
#   ./deploy-file.sh irmandade ./server/api/webhook.post.ts server/api/webhook.post.ts --restart
#   ./deploy-file.sh elder ./aviator-app/app.vue aviator-app/app.vue --restart   # alvo = frontend
#
# Opções:
#   --build     Roda "npm run build" no projeto depois de copiar
#   --restart   Reinicia o PM2 do app depois de copiar (e build, se pedido)
#   -y|--yes    Não pergunta confirmação
#
# Faz backup do arquivo atual (arquivo.bak-<data>) antes de sobrescrever.
# Para arquivos sensíveis (.env, ecosystem.config.cjs) ele pede confirmação extra.
# ----------------------------------------------------------------------------
set -uo pipefail

if [[ -t 1 ]]; then C_RESET=$'\e[0m'; C_RED=$'\e[31m'; C_GRN=$'\e[32m'; C_YLW=$'\e[33m'; C_BOLD=$'\e[1m'
else C_RESET=''; C_RED=''; C_GRN=''; C_YLW=''; C_BOLD=''; fi
ok()   { printf '%s[ ok  ]%s %s\n' "$C_GRN" "$C_RESET" "$*"; }
warn() { printf '%s[warn ]%s %s\n' "$C_YLW" "$C_RESET" "$*" >&2; }
err()  { printf '%s[erro ]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
step() { printf '\n%s==> %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }

DATE_TAG="$(date +%F-%H%M)"

# (label do diretório raiz do projeto, nome PM2, porta, usa-ecosystem)
project_dir=""; pm2_name=""; port=""; use_eco=0
configure_app() {
  case "$1" in
    rainha)    project_dir="/var/www/rainhaclub/rainha-da-bet";              pm2_name="aplicativo-rainha-da-bet"; port=3098; use_eco=1;;
    irmandade) project_dir="/var/www/irmandadebacbo/irmandade";              pm2_name="irmandade";                port=3099; use_eco=1;;
    baccarat)  project_dir="/var/www/baccaratlegacy/Baccaratleagcy/frontend"; pm2_name="baccaratlegacy";          port=3100; use_eco=0;;
    luisa)     project_dir="/var/www/luisaaviator/luisa-aviator/frontend";   pm2_name="luisaaviator-front";       port=3012; use_eco=0;;
    flowup)    project_dir="/var/www/flow-up/flow-up";                       pm2_name="flowup";                   port=3014; use_eco=0;;
    elder)     project_dir="/var/www/elder-aviator/elder-aviator-update";    pm2_name="elder-aviator-front";      port=3101; use_eco=0;;
    *) err "App desconhecido: '$1' (rainha|irmandade|baccarat|luisa|flowup|elder)"; exit 2;;
  esac
}

DO_BUILD=0; DO_RESTART=0; ASSUME_YES=0; pos=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) DO_BUILD=1; shift;;
    --restart) DO_RESTART=1; shift;;
    -y|--yes) ASSUME_YES=1; shift;;
    -*) err "Opção desconhecida: $1"; exit 2;;
    *) pos+=("$1"); shift;;
  esac
done
APP_KEY="${pos[0]:-}"; SRC_FILE="${pos[1]:-}"; REL_DST="${pos[2]:-}"
[[ -z "$APP_KEY" || -z "$SRC_FILE" || -z "$REL_DST" ]] && { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

configure_app "$APP_KEY"
[[ -f "$SRC_FILE" ]] || { err "Arquivo local não existe: $SRC_FILE"; exit 2; }
DST_FILE="$project_dir/$REL_DST"

step "Deploy de arquivo"
printf '  App:     %s (pm2=%s, porta=%s)\n' "$APP_KEY" "$pm2_name" "$port"
printf '  Origem:  %s\n' "$SRC_FILE"
printf '  Destino: %s\n' "$DST_FILE"

case "$(basename "$REL_DST")" in
  .env|ecosystem.config.cjs)
    warn "Você está sobrescrevendo um arquivo sensível ($(basename "$REL_DST"))."
    ;;
esac

if (( ASSUME_YES == 0 )); then
  [[ -t 0 ]] || { err "Sem terminal; use --yes."; exit 2; }
  read -rp "Confirmar cópia? [s/N] " a; [[ "$a" =~ ^[sSyY]$ ]] || { warn "Cancelado."; exit 0; }
fi

mkdir -p "$(dirname "$DST_FILE")" || { err "Não consegui criar a pasta de destino"; exit 1; }
if [[ -f "$DST_FILE" ]]; then
  cp -a "$DST_FILE" "${DST_FILE}.bak-${DATE_TAG}" && ok "Backup: ${DST_FILE}.bak-${DATE_TAG}"
fi
cp -a "$SRC_FILE" "$DST_FILE" && ok "Arquivo copiado."

if (( DO_BUILD == 1 )); then
  step "npm run build em $project_dir"
  ( cd "$project_dir" && npm run build ) || { err "build falhou — restaure o .bak se necessário"; exit 1; }
fi

if (( DO_RESTART == 1 )); then
  step "Reiniciando PM2: $pm2_name"
  if (( use_eco == 1 )) && [[ -f "$project_dir/ecosystem.config.cjs" ]]; then
    ( cd "$project_dir" && pm2 startOrReload ecosystem.config.cjs --update-env ) || { err "PM2 falhou"; exit 1; }
  else
    pm2 restart "$pm2_name" --update-env || { err "PM2 falhou"; exit 1; }
  fi
  pm2 save || warn "pm2 save retornou erro"
  step "Testando porta $port"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port" 2>/dev/null || echo 000)"
  [[ "$code" != "000" ]] && ok "localhost:$port -> HTTP $code" || warn "localhost:$port não respondeu"
fi

ok "Concluído."
