/**
 * Migração dos sinais para o padrão de query string no WebSocket.
 *
 *   wss://ws-signals.automagroup.cloud/ws?name=<name>&collection=<collection>
 *
 * O app monta essa URL em app/pages/jogo/[id].vue (buildSignalWsUrl). Este
 * script percorre todos os jogos de app/constants/gameRoutes.ts, resolve a
 * config de sinal exatamente como o useGame faz (API primeiro, fallback
 * embutido depois), abre a conexão e confirma que o servidor assina a sala
 * já no handshake.
 *
 *   node scripts/migrar-sinais-wss.mjs             # todos os jogos
 *   node scripts/migrar-sinais-wss.mjs bac-bo-en   # só um jogo
 *
 * Saída: uma linha por jogo + resumo. Exit code 1 se algum jogo falhar.
 */
import { GAME_ROUTE_DEFINITIONS, getGameRouteConfig } from '../app/constants/gameRoutes.ts'

const SIGNAL_API_BASE = 'https://api-apps-server.automagroup.com.br'
// Espelha SIGNAL_WS_FALLBACK_URL do app/composables/useGame.ts.
const SIGNAL_WS_FALLBACK_URL = 'wss://ws-signals.automagroup.cloud/ws'
const TIMEOUT_MS = 12000

// Mesma lógica de app/pages/jogo/[id].vue — mantenha as duas em sincronia.
const buildSignalWsUrl = (baseUrl, name, collection) => {
  try {
    const parsed = new URL(baseUrl)
    parsed.searchParams.set('name', name)

    if (collection) {
      parsed.searchParams.set('collection', collection)
    } else {
      parsed.searchParams.delete('collection')
    }

    return parsed.toString()
  } catch {
    const params = new URLSearchParams({ name })
    if (collection) params.set('collection', collection)

    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`
  }
}

// Espelha fetchGameConfig do useGame: API primeiro, fallback do gameRoutes
// depois. Igual ao useGame, o fallback ignora um eventual ref.url e usa sempre
// a SIGNAL_WS_FALLBACK_URL.
const resolveSignalConfig = async (ref) => {
  const fallback = {
    signalUrl: SIGNAL_WS_FALLBACK_URL,
    signalName: ref.name,
    signalCollection: ref.collection,
    origem: 'fallback'
  }

  try {
    const res = await fetch(`${SIGNAL_API_BASE}/api/game-config/${ref.collection}/${ref.name}`)
    if (!res.ok) return { ...fallback, origem: `fallback (API ${res.status})` }

    const wss = (await res.json())?.sinais_wss
    // No useGame deste app um 200 sem sinais_wss devolve null (o jogo fica sem
    // sinal). Aqui sinalizamos isso em vez de mascarar com o fallback.
    if (!wss?.signalUrl || !wss?.signalName) return { semSinal: true, origem: 'API 200 sem sinais_wss' }

    return {
      signalUrl: wss.signalUrl,
      signalName: wss.signalName,
      signalCollection: wss.signalCollection ?? undefined,
      origem: 'API'
    }
  } catch (err) {
    return { ...fallback, origem: `fallback (API erro: ${err.message})` }
  }
}

// Conecta e espera o "subscribed" — sem mandar mensagem nenhuma, provando que
// a query string sozinha resolve a assinatura.
const verificarAssinatura = (wsUrl, esperado) => new Promise((resolve) => {
  let ws
  const finalizar = (resultado) => {
    clearTimeout(timer)
    try { ws?.close() } catch {}
    resolve(resultado)
  }

  const timer = setTimeout(
    () => finalizar({ ok: false, motivo: `sem "subscribed" em ${TIMEOUT_MS / 1000}s` }),
    TIMEOUT_MS
  )

  try {
    ws = new WebSocket(wsUrl)
  } catch (err) {
    return finalizar({ ok: false, motivo: `URL invalida: ${err.message}` })
  }

  ws.onerror = () => finalizar({ ok: false, motivo: 'erro de conexao' })
  ws.onclose = (ev) => finalizar({ ok: false, motivo: `fechou antes do subscribed (code ${ev.code})` })

  ws.onmessage = (ev) => {
    let msg
    try { msg = JSON.parse(ev.data) } catch { return }
    if (msg?.type !== 'subscribed') return

    const bateName = msg.name === esperado.name
    const bateCollection = (msg.collection ?? undefined) === (esperado.collection ?? undefined)

    if (!bateName || !bateCollection) {
      return finalizar({
        ok: false,
        motivo: `servidor assinou ${msg.collection}/${msg.name}, esperado ${esperado.collection}/${esperado.name}`
      })
    }

    finalizar({ ok: true })
  }
})

const alvo = process.argv[2]
const ids = alvo ? [alvo] : Object.keys(GAME_ROUTE_DEFINITIONS)

if (alvo && !GAME_ROUTE_DEFINITIONS[alvo]) {
  console.error(`Jogo desconhecido: ${alvo}`)
  console.error(`Disponiveis: ${Object.keys(GAME_ROUTE_DEFINITIONS).join(', ')}`)
  process.exit(1)
}

console.log(`Migracao WSS -> query string | ${ids.length} jogo(s)\n`)

const falhas = []
const semSinal = []

for (const id of ids) {
  const ref = getGameRouteConfig(id).signalRef
  if (!ref) {
    semSinal.push(id)
    console.log(`  --  ${id.padEnd(32)} sem signalRef, nada a migrar`)
    continue
  }

  const cfg = await resolveSignalConfig(ref)
  if (cfg.semSinal) {
    semSinal.push(id)
    console.log(`  --  ${id.padEnd(32)} ${cfg.origem} -> o app fica sem sinal`)
    continue
  }

  const wsUrl = buildSignalWsUrl(cfg.signalUrl, cfg.signalName, cfg.signalCollection)
  const resultado = await verificarAssinatura(wsUrl, {
    name: cfg.signalName,
    collection: cfg.signalCollection
  })

  console.log(`  ${resultado.ok ? 'OK' : 'XX'}  ${id.padEnd(32)} ${wsUrl}`)
  console.log(`      config via ${cfg.origem}`)

  if (!resultado.ok) {
    falhas.push({ id, motivo: resultado.motivo })
    console.log(`      FALHOU: ${resultado.motivo}`)
  }
}

console.log(`\n${ids.length - falhas.length - semSinal.length} ok | ${falhas.length} falha(s) | ${semSinal.length} sem sinal`)

if (falhas.length) {
  console.log('\nFalhas:')
  for (const f of falhas) console.log(`  ${f.id}: ${f.motivo}`)
  process.exit(1)
}
