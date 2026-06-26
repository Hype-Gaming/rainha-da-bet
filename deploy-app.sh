#!/usr/bin/env bash
#
# deploy-app.sh — Deploy seguro de apps Node/Nuxt (Nitro) na VPS
# ----------------------------------------------------------------------------
# Uso:
#   ./deploy-app.sh <app> <caminho-do-zip-ou-pasta> [opções]
#
# Apps suportados:
#   rainha | irmandade | baccarat | luisa | flowup | elder
#
# Opções:
#   --replace-env          Copia o .env novo vindo do pacote (padrão: PRESERVA o atual)
#   --replace-ecosystem    Copia o ecosystem.config.cjs novo (padrão: PRESERVA o atual)
#   --no-build             Pula o "npm run build"
#   --skip-domain          Não testa o domínio (só a porta local)
#   --keep-backups N       Quantos backups manter por projeto (padrão: 5)
#   -y | --yes             Modo não-interativo (assume sim / escolhe automaticamente)
#   -h | --help            Mostra ajuda e o checklist de rollback
#
# Fluxo: valida pacote -> extrai em temp -> detecta package.json -> backup da versão
# atual + backup do .env -> rsync (preservando node_modules/.output/.nuxt/dist/.git
# e, por padrão, .env/ecosystem) -> npm install -> npm run build -> reinicia PM2 ->
# testa porta local + domínio -> pm2 save. Em erro: mostra logs do PM2, diagnostica
# a porta e NÃO apaga o backup.
# ----------------------------------------------------------------------------
set -uo pipefail

# ----------------------------- Aparência / logs -----------------------------
if [[ -t 1 ]]; then
  C_RESET=$'\e[0m'; C_RED=$'\e[31m'; C_GRN=$'\e[32m'; C_YLW=$'\e[33m'; C_BLU=$'\e[34m'; C_BOLD=$'\e[1m'
else
  C_RESET=''; C_RED=''; C_GRN=''; C_YLW=''; C_BLU=''; C_BOLD=''
fi
log()  { printf '%s[deploy]%s %s\n' "$C_BLU" "$C_RESET" "$*"; }
ok()   { printf '%s[ ok  ]%s %s\n' "$C_GRN" "$C_RESET" "$*"; }
warn() { printf '%s[warn ]%s %s\n' "$C_YLW" "$C_RESET" "$*" >&2; }
err()  { printf '%s[erro ]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
step() { printf '\n%s==> %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }

DATE_TAG="$(date +%F-%H%M)"

# Estado global (usado pelo handler de erro)
SERVICE_LABELS=(); SERVICE_DIRS=(); SERVICE_PM2=(); SERVICE_PORTS=(); SERVICE_BUILD=(); SERVICE_ECO=()
PM2_NAMES=()
DEPLOY_ROOT=""; TEMP_DIR=""; APP_DOMAIN=""; APP_NAME=""; APP_KEY=""
SRC_LAYOUT="project"; FIRST_SERVICE_RELDIR=""; SRC_ROOT=""; BACKUP_PATH=""

usage() {
  sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
  cat <<EOF

${C_BOLD}CHECKLIST DE ROLLBACK (manual)${C_RESET}
  1) pm2 stop <nome-pm2>
  2) mv  /caminho/projeto            /caminho/projeto-FALHOU-<data>
  3) mv  /caminho/projeto-backup-<data>   /caminho/projeto
  4) cd  /caminho/projeto && npm install
  5) pm2 restart <nome-pm2> --update-env   (ou pm2 start ecosystem.config.cjs --update-env)
  6) pm2 save
  7) curl -I http://localhost:<porta>   e   curl -I <dominio>
EOF
}

# ----------------------------- Handler de erro ------------------------------
fail() {
  err "$*"
  step "Diagnóstico"
  for n in "${PM2_NAMES[@]:-}"; do
    [[ -z "$n" ]] && continue
    warn "PM2 logs de '$n' (últimas 80 linhas):"
    pm2 logs "$n" --lines 80 --nostream 2>/dev/null || true
  done
  for p in "${SERVICE_PORTS[@]:-}"; do
    [[ -z "$p" ]] && continue
    warn "Quem escuta a porta $p:"
    ss -ltnp 2>/dev/null | grep ":$p" || echo "       (nada escutando em :$p)"
    command -v lsof >/dev/null 2>&1 && { sudo lsof -i ":$p" 2>/dev/null || lsof -i ":$p" 2>/dev/null || true; }
  done
  echo
  if [[ -n "$BACKUP_PATH" ]]; then
    err "Backup PRESERVADO em: $BACKUP_PATH"
    err "Rollback rápido:"
    err "  pm2 stop ${PM2_NAMES[*]:-<nome>}"
    err "  mv '$DEPLOY_ROOT' '${DEPLOY_ROOT}-FALHOU-${DATE_TAG}'"
    err "  mv '$BACKUP_PATH' '$DEPLOY_ROOT'"
    err "  cd '$DEPLOY_ROOT' && npm install && pm2 restart ${PM2_NAMES[*]:-<nome>} --update-env && pm2 save"
  fi
  exit 1
}

# ------------------------------ Config por app ------------------------------
add_service() {
  # label  dir-absoluto  nome-pm2  porta  build(1/0)  ecosystem(1/0)
  SERVICE_LABELS+=("$1"); SERVICE_DIRS+=("$2"); SERVICE_PM2+=("$3")
  SERVICE_PORTS+=("$4");  SERVICE_BUILD+=("$5"); SERVICE_ECO+=("$6")
  PM2_NAMES+=("$3")
}

configure_app() {
  case "$1" in
    rainha)
      APP_NAME="Rainha da Bet"
      DEPLOY_ROOT="/var/www/rainhaclub/rainha-da-bet"
      TEMP_DIR="/var/www/rainhaclub/update-temp"
      APP_DOMAIN="https://app.rainhaclub.com"
      SRC_LAYOUT="project"
      add_service "app" "$DEPLOY_ROOT" "aplicativo-rainha-da-bet" 3098 1 1
      ;;
    irmandade)
      APP_NAME="Irmandade Bacbo"
      DEPLOY_ROOT="/var/www/irmandadebacbo/irmandade"
      TEMP_DIR="/var/www/irmandadebacbo/update-temp"
      APP_DOMAIN="https://app.irmandadebacbo.com"
      SRC_LAYOUT="project"
      add_service "app" "$DEPLOY_ROOT" "irmandade" 3099 1 1
      ;;
    baccarat)
      APP_NAME="Baccarat Legacy"
      DEPLOY_ROOT="/var/www/baccaratlegacy/Baccaratleagcy/frontend"
      TEMP_DIR="/var/www/baccaratlegacy/update-temp"
      APP_DOMAIN="https://app.baccaratlegacy.com"
      SRC_LAYOUT="project"
      add_service "app" "$DEPLOY_ROOT" "baccaratlegacy" 3100 1 0
      ;;
    luisa)
      APP_NAME="Luisa Aviator"
      DEPLOY_ROOT="/var/www/luisaaviator/luisa-aviator/frontend"
      TEMP_DIR="/var/www/luisaaviator/update-temp"
      APP_DOMAIN="https://app.luisaaviator.com"
      SRC_LAYOUT="project"
      add_service "app" "$DEPLOY_ROOT" "luisaaviator-front" 3012 1 0
      ;;
    flowup)
      APP_NAME="FlowUp"
      DEPLOY_ROOT="/var/www/flow-up/flow-up"
      TEMP_DIR="/var/www/flow-up/update-temp"
      APP_DOMAIN="https://app.hypeflowup.com"
      SRC_LAYOUT="project"
      add_service "app" "$DEPLOY_ROOT" "flowup" 3014 1 0
      ;;
    elder)
      # App com 2 serviços: frontend Nitro (3101) + backend API (3399).
      # NGINX deve mandar TUDO para o frontend 3101 (inclusive /api/*); nada de
      # location /api/ -> 3399, pois as rotas /api/* moram no Nitro.
      APP_NAME="Elder / AviatorPrime"
      DEPLOY_ROOT="/var/www/elder-aviator/elder-aviator-update"
      TEMP_DIR="/var/www/elder-aviator/update-temp"
      APP_DOMAIN="https://app.aviatorprime.com"
      SRC_LAYOUT="root"
      FIRST_SERVICE_RELDIR="aviator-app"
      add_service "frontend" "$DEPLOY_ROOT/aviator-app" "elder-aviator-front" 3101 1 0
      add_service "backend"  "$DEPLOY_ROOT/api"         "elder-aviator-api"   3399 0 0
      ;;
    *)
      err "App desconhecido: '$1'"
      echo "Apps válidos: rainha | irmandade | baccarat | luisa | flowup | elder" >&2
      exit 2
      ;;
  esac
}

# ------------------------------- Parse args ---------------------------------
REPLACE_ENV=0; REPLACE_ECO=0; DO_BUILD=1; SKIP_DOMAIN=0; ASSUME_YES=0; KEEP_BACKUPS=5
positional=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --replace-env)       REPLACE_ENV=1; shift;;
    --replace-ecosystem) REPLACE_ECO=1; shift;;
    --no-build)          DO_BUILD=0; shift;;
    --skip-domain)       SKIP_DOMAIN=1; shift;;
    --keep-backups)      KEEP_BACKUPS="${2:-5}"; shift 2;;
    -y|--yes)            ASSUME_YES=1; shift;;
    -h|--help)           usage; exit 0;;
    --) shift; while [[ $# -gt 0 ]]; do positional+=("$1"); shift; done;;
    -*) err "Opção desconhecida: $1"; usage; exit 2;;
    *)  positional+=("$1"); shift;;
  esac
done
APP_KEY="${positional[0]:-}"
ZIP_PATH="${positional[1]:-}"
[[ -z "$APP_KEY" || -z "$ZIP_PATH" ]] && { usage; exit 2; }

# ------------------------------- Funções ------------------------------------
preflight() {
  local miss=()
  for c in rsync npm pm2 curl ss; do command -v "$c" >/dev/null 2>&1 || miss+=("$c"); done
  command -v unzip >/dev/null 2>&1 || command -v tar >/dev/null 2>&1 || miss+=("unzip|tar")
  (( ${#miss[@]} )) && warn "Ferramentas ausentes: ${miss[*]} — instale antes de prosseguir."
}

confirm() {
  (( ASSUME_YES == 1 )) && return 0
  [[ -t 0 ]] || fail "Sem terminal interativo. Use --yes para rodar de forma não-interativa."
  read -rp "Confirmar deploy? [s/N] " a
  [[ "$a" =~ ^[sSyY]$ ]] || { warn "Cancelado pelo usuário."; exit 0; }
}

print_plan() {
  printf '\n%s==== PLANO DE DEPLOY ====%s\n' "$C_BOLD" "$C_RESET"
  printf '  App:          %s (%s)\n' "$APP_NAME" "$APP_KEY"
  printf '  Pacote:       %s\n' "$ZIP_PATH"
  printf '  Destino:      %s\n' "$DEPLOY_ROOT"
  printf '  Temp:         %s\n' "$TEMP_DIR"
  printf '  Domínio:      %s\n' "${APP_DOMAIN:-<n/d>}"
  printf '  Serviços:\n'
  local i
  for i in "${!SERVICE_DIRS[@]}"; do
    printf '    - %-9s pm2=%-22s porta=%-5s dir=%s\n' \
      "${SERVICE_LABELS[$i]}" "${SERVICE_PM2[$i]}" "${SERVICE_PORTS[$i]}" "${SERVICE_DIRS[$i]}"
  done
  printf '  Substituir .env:       %s\n' "$([[ $REPLACE_ENV == 1 ]] && echo SIM || echo 'não (preserva atual)')"
  printf '  Substituir ecosystem:  %s\n' "$([[ $REPLACE_ECO == 1 ]] && echo SIM || echo 'não (preserva atual)')"
  printf '  Rodar build:           %s\n' "$([[ $DO_BUILD == 1 ]] && echo SIM || echo não)"
  echo
}

prepare_temp() {
  step "Preparando pasta temporária: $TEMP_DIR"
  [[ -e "$ZIP_PATH" ]] || fail "Origem não encontrada: $ZIP_PATH"
  rm -rf "$TEMP_DIR"; mkdir -p "$TEMP_DIR" || fail "Não consegui criar $TEMP_DIR"
  if [[ -d "$ZIP_PATH" ]]; then
    log "Origem é uma pasta — copiando para o temp..."
    rsync -a "$ZIP_PATH"/ "$TEMP_DIR"/ || fail "Falha ao copiar a pasta de origem"
  else
    case "$ZIP_PATH" in
      *.zip)          unzip -q "$ZIP_PATH" -d "$TEMP_DIR" || fail "Falha ao extrair o ZIP";;
      *.tar.gz|*.tgz) tar -xzf "$ZIP_PATH" -C "$TEMP_DIR" || fail "Falha ao extrair o tar.gz";;
      *) fail "Formato não suportado: $ZIP_PATH (use .zip, .tar.gz ou uma pasta)";;
    esac
  fi
  ok "Pacote extraído em $TEMP_DIR"
}

detect_src_root() {
  step "Detectando a raiz do código no pacote"
  if [[ "$SRC_LAYOUT" == "root" ]]; then
    local hit
    hit="$(find "$TEMP_DIR" -maxdepth 8 -type d -name "$FIRST_SERVICE_RELDIR" 2>/dev/null | grep -v node_modules | head -n1)"
    [[ -z "$hit" ]] && fail "Não encontrei a pasta '$FIRST_SERVICE_RELDIR' dentro do pacote."
    SRC_ROOT="$(dirname "$hit")"
  else
    local pkgs=()
    mapfile -t pkgs < <(find "$TEMP_DIR" -maxdepth 8 -type f -name package.json 2>/dev/null | grep -v node_modules | sort)
    local n=${#pkgs[@]}
    if   (( n == 0 )); then fail "Nenhum package.json encontrado no pacote."
    elif (( n == 1 )); then SRC_ROOT="$(dirname "${pkgs[0]}")"
    else
      warn "Encontrei vários package.json:"
      local i=1 p; for p in "${pkgs[@]}"; do printf '     %d) %s\n' "$i" "$(dirname "$p")"; ((i++)); done
      # heurística: o caminho mais raso (menos barras) costuma ser a raiz do projeto
      local shallow="${pkgs[0]}" sd; sd=$(tr -cd '/' <<<"$shallow" | wc -c)
      for p in "${pkgs[@]}"; do local d; d=$(tr -cd '/' <<<"$p" | wc -c); (( d < sd )) && { shallow="$p"; sd=$d; }; done
      if (( ASSUME_YES == 1 )) || [[ ! -t 0 ]]; then
        SRC_ROOT="$(dirname "$shallow")"
        warn "Escolhido automaticamente (mais raso): $SRC_ROOT"
      else
        read -rp "Número da pasta do projeto [Enter = mais raso]: " choice
        if [[ -z "$choice" ]]; then SRC_ROOT="$(dirname "$shallow")"
        else SRC_ROOT="$(dirname "${pkgs[$((choice-1))]:-${shallow}}")"; fi
      fi
    fi
  fi
  [[ -d "$SRC_ROOT" ]] || fail "Raiz de origem inválida: $SRC_ROOT"
  ok "Raiz do código novo: $SRC_ROOT"
}

backup_current() {
  if [[ ! -d "$DEPLOY_ROOT" ]]; then
    warn "Destino não existe ($DEPLOY_ROOT). Primeira instalação? Pulando backup."
    mkdir -p "$DEPLOY_ROOT"
    return
  fi
  BACKUP_PATH="${DEPLOY_ROOT}-backup-${DATE_TAG}"
  step "Backup da versão atual -> $BACKUP_PATH"
  # Backup sem node_modules/.git (regeneráveis) para economizar disco.
  # .env, .output, .nuxt e dist são mantidos => rollback praticamente imediato.
  rsync -a --exclude node_modules --exclude .git "$DEPLOY_ROOT"/ "$BACKUP_PATH"/ \
    || fail "Falha ao criar o backup"
  ok "Backup criado: $BACKUP_PATH"
  local d
  for d in "${SERVICE_DIRS[@]}"; do
    if [[ -f "$d/.env" ]]; then
      cp -a "$d/.env" "$d/.env.bak-${DATE_TAG}" && ok "Backup do .env: $d/.env.bak-${DATE_TAG}"
    fi
  done
}

deploy_code() {
  step "Copiando código novo (rsync --delete) -> $DEPLOY_ROOT"
  local ex=( --exclude node_modules --exclude .output --exclude .nuxt --exclude dist --exclude .git )
  if (( REPLACE_ENV == 0 )); then ex+=( --exclude '.env' --exclude '.env.*' )
  else warn "Substituindo .env pelo do pacote (--replace-env)"; fi
  if (( REPLACE_ECO == 0 )); then ex+=( --exclude 'ecosystem.config.cjs' )
  else warn "Substituindo ecosystem.config.cjs pelo do pacote (--replace-ecosystem)"; fi
  rsync -a --delete "${ex[@]}" "$SRC_ROOT"/ "$DEPLOY_ROOT"/ || fail "Falha no rsync"
  ok "Código atualizado (preservados: node_modules .output .nuxt dist .git$([[ $REPLACE_ENV == 0 ]] && echo ' .env')$([[ $REPLACE_ECO == 0 ]] && echo ' ecosystem.config.cjs'))"
}

show_env_safe() {
  local f="$1"
  [[ -f "$f" ]] || { log "Sem .env em $(dirname "$f")"; return; }
  log "Resumo do .env ($f) — sensíveis mascarados:"
  local line key
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in ''|\#*) continue;; esac
    key="${line%%=*}"
    case "$key" in
      NODE_ENV|PORT|HOST|NITRO_PORT|NITRO_HOST) printf '       %s\n' "$line";;
      *) printf '       %s=********\n' "$key";;
    esac
  done < "$f"
}

show_eco_safe() {
  local f="$1"
  [[ -f "$f" ]] || return
  log "Resumo do ecosystem ($f):"
  grep -E 'name:|script:|cwd:|instances:|exec_mode:|PORT|NITRO_PORT|NITRO_HOST' "$f" 2>/dev/null \
    | sed -E "s/(SECRET|PASSWORD|PASS|TOKEN|KEY|URI|MONGO)[A-Za-z_]*[[:space:]]*:[[:space:]]*['\"][^'\"]*['\"]/\1: '********'/Ig" \
    | sed 's/^/       /' || true
}

has_build_script() { [[ -f "$1/package.json" ]] && grep -qE '"build"[[:space:]]*:' "$1/package.json"; }

install_and_build() {
  local i dir label build
  for i in "${!SERVICE_DIRS[@]}"; do
    dir="${SERVICE_DIRS[$i]}"; label="${SERVICE_LABELS[$i]}"; build="${SERVICE_BUILD[$i]}"
    [[ -f "$dir/package.json" ]] || fail "[$label] package.json não encontrado em $dir"
    show_env_safe "$dir/.env"
    show_eco_safe "$dir/ecosystem.config.cjs"
    step "[$label] npm install ($dir)"
    ( cd "$dir" && npm install ) || fail "[$label] npm install falhou"
    if (( DO_BUILD == 1 )) && (( build == 1 )) && has_build_script "$dir"; then
      step "[$label] npm run build"
      ( cd "$dir" && npm run build ) || fail "[$label] npm run build falhou"
    else
      log "[$label] build pulado (flag/no-build ou sem script de build)."
    fi
  done
}

restart_pm2() {
  local i dir label name eco
  for i in "${!SERVICE_DIRS[@]}"; do
    dir="${SERVICE_DIRS[$i]}"; label="${SERVICE_LABELS[$i]}"; name="${SERVICE_PM2[$i]}"; eco="${SERVICE_ECO[$i]}"
    step "[$label] Reiniciando PM2: $name"
    if (( eco == 1 )) && [[ -f "$dir/ecosystem.config.cjs" ]]; then
      # startOrReload = zero-downtime; fallback para delete+start se algo travar
      if ! ( cd "$dir" && pm2 startOrReload ecosystem.config.cjs --update-env ); then
        warn "[$label] startOrReload falhou; tentando delete + start"
        ( cd "$dir" && pm2 delete "$name" 2>/dev/null; pm2 start ecosystem.config.cjs --update-env ) \
          || fail "[$label] PM2 falhou (ecosystem)"
      fi
    else
      if ! pm2 restart "$name" --update-env 2>/dev/null; then
        warn "[$label] processo '$name' não existia; tentando criar via 'npm start'"
        ( cd "$dir" && pm2 start npm --name "$name" -- start ) || fail "[$label] PM2 não conseguiu iniciar '$name'"
      fi
    fi
    ok "[$label] PM2 OK ($name)"
  done
}

wait_port() {
  local port="$1" label="$2" tries=20 code t
  step "[$label] Testando porta local $port"
  for ((t=1; t<=tries; t++)); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port" 2>/dev/null || echo 000)"
    if [[ "$code" != "000" ]]; then
      ok "[$label] localhost:$port respondeu HTTP $code"
      curl -I -s --max-time 5 "http://localhost:$port" | head -n1 || true
      return 0
    fi
    sleep 2
  done
  fail "[$label] App não respondeu em localhost:$port após $((tries*2))s"
}

test_ports() {
  local i
  for i in "${!SERVICE_PORTS[@]}"; do
    wait_port "${SERVICE_PORTS[$i]}" "${SERVICE_LABELS[$i]}"
  done
}

test_domain() {
  (( SKIP_DOMAIN == 1 )) && { log "Teste de domínio pulado (--skip-domain)"; return; }
  [[ -z "$APP_DOMAIN" ]] && return
  step "Testando domínio: $APP_DOMAIN"
  local code
  code="$(curl -I -s -o /dev/null -w '%{http_code}' --max-time 10 "$APP_DOMAIN" 2>/dev/null || echo 000)"
  if [[ "$code" =~ ^[23] ]]; then ok "Domínio respondeu HTTP $code"
  else warn "Domínio respondeu HTTP $code — verifique NGINX/Certbot. (não dispara rollback)"; fi
}

elder_extra_checks() {
  step "Checagens específicas — Elder/AviatorPrime"
  local hc body
  hc="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3399/api/health 2>/dev/null || echo 000)"
  if [[ "$hc" =~ ^[23] ]]; then ok "Backend /api/health: HTTP $hc"; else warn "Backend /api/health: HTTP $hc"; fi
  body="$(curl -s --max-time 10 "https://app.aviatorprime.com/api/start-game/?slug=evolution/mega-roulette&platform=WEB&use_demo=0" 2>/dev/null || true)"
  log "Resposta /api/start-game: $body"
  if grep -q "Token de autorização ausente" <<<"$body"; then
    ok "Rota /api/start-game encaminhada ao Nitro (3101) corretamente."
  else
    warn "Resposta inesperada em /api/start-game."
    warn "Confirme no NGINX: TUDO -> 3101 (frontend Nitro). NÃO pode haver 'location /api/' -> 3399."
  fi
}

prune_backups() {
  local backups=()
  mapfile -t backups < <(ls -1dt "${DEPLOY_ROOT}"-backup-* 2>/dev/null)
  (( ${#backups[@]} <= KEEP_BACKUPS )) && return
  step "Limpando backups antigos (mantendo $KEEP_BACKUPS)"
  local i=0 b
  for b in "${backups[@]}"; do
    ((i++)); (( i > KEEP_BACKUPS )) && { warn "rm -rf $b"; rm -rf "$b"; }
  done
}

# --------------------------------- Main -------------------------------------
main() {
  configure_app "$APP_KEY"
  preflight
  print_plan
  confirm
  prepare_temp
  detect_src_root
  backup_current
  deploy_code
  install_and_build
  restart_pm2
  step "pm2 save"
  pm2 save || warn "pm2 save retornou erro (verifique manualmente)"
  test_ports
  test_domain
  [[ "$APP_KEY" == "elder" ]] && elder_extra_checks
  prune_backups
  echo
  ok "Deploy de '$APP_NAME' concluído com sucesso. 🎉"
  [[ -n "$BACKUP_PATH" ]] && log "Backup desta versão: $BACKUP_PATH"
}

main "$@"
