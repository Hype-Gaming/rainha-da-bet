#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/insider-club-rainha-da-bet/public"
DST="$DIR/public"

echo "📁 Copiando assets da Rainha da Bet..."

cp -f "$SRC/logo.png"                        "$DST/logo.png"
cp -f "$SRC/banners/grupovip.png"            "$DST/banners/grupovip.png"
cp -f "$SRC/banners/instagram.png"           "$DST/banners/instagram.png"
cp -f "$SRC/banners/telegram.png"            "$DST/banners/telegram.png"
cp -f "$SRC/banners/whatsapp.png"            "$DST/banners/whatsapp.png"
cp -f "$SRC/games/bac-bo-ao-vivo.png"        "$DST/games/bac-bo-ao-vivo.png"
cp -f "$SRC/games/bac-bo-en.png"             "$DST/games/bac-bo-en.png"
cp -f "$SRC/games/football_studio_br.png"    "$DST/games/football_studio_br.png"
cp -f "$SRC/games/football_studio_eng.png"   "$DST/games/football_studio_eng.png"
cp -f "$SRC/games/grupo.png"                 "$DST/games/grupo.png"
cp -f "$SRC/cards/gestaodebanca.png"         "$DST/cards/gestaodebanca.png"
cp -f "$SRC/cards/operar.png"                "$DST/cards/operar.png"

echo "✅ Todos os assets copiados com sucesso!"
echo ""
echo "🚀 Agora rode: npm run dev -- --port 3002"
