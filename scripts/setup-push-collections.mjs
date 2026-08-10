// Cria as collections e os indices usados pelas notificacoes push.
//
// Rode no servidor de producao, a partir da raiz do projeto:
//   node scripts/setup-push-collections.mjs
//
// E idempotente: rodar de novo nao apaga nem duplica nada. O proprio codigo da
// aplicacao ja cria esses indices de forma preguicosa na primeira requisicao,
// entao este script serve para deixar o banco pronto ANTES do primeiro uso e
// para conferir o estado do que ja existe.

import { MongoClient } from 'mongodb'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Le o .env do projeto do mesmo jeito que o ecosystem.config.cjs faz, para que
// o script funcione sem depender de variaveis ja exportadas no shell.
const loadEnv = () => {
  const envPath = path.join(projectRoot, '.env')
  if (!fs.existsSync(envPath)) return {}

  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return env
      const i = trimmed.indexOf('=')
      if (i === -1) return env
      env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
      return env
    }, {})
}

const fileEnv = loadEnv()

// MESMOS defaults de server/utils/mongodb.ts. Se divergirem, este script criaria
// as collections em outro banco e a aplicacao nunca as enxergaria.
const MONGO_URI = process.env.MONGODB_URI || fileEnv.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const DB_NAME = process.env.MONGO_DB_NAME || fileEnv.MONGO_DB_NAME || 'rainha_da_bet'

// Esconde a senha ao imprimir a URI.
const safeUri = MONGO_URI.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:***@')

const ensureCollection = async (db, name) => {
  const existing = await db.listCollections({ name }).toArray()
  if (existing.length > 0) {
    console.log(`  collection '${name}': ja existia`)
    return
  }
  await db.createCollection(name)
  console.log(`  collection '${name}': CRIADA`)
}

const ensureIndex = async (db, collectionName, keys, options = {}) => {
  const label = `${collectionName} ${JSON.stringify(keys)}${options.unique ? ' (unico)' : ''}`
  try {
    const name = await db.collection(collectionName).createIndex(keys, options)
    console.log(`  indice ${label}: ok (${name})`)
  } catch (err) {
    // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict: ja existe um
    // indice com essas chaves e opcoes diferentes.
    if (err?.code === 85 || err?.code === 86) {
      console.warn(`  indice ${label}: JA EXISTE com opcoes diferentes — nao alterado. ${err.message}`)
      return
    }
    // 11000 em createIndex unico = ha duplicatas nos dados impedindo o indice.
    if (err?.code === 11000) {
      console.error(`  indice ${label}: FALHOU — ha documentos duplicados. ${err.message}`)
      console.error('    Remova as duplicatas de endpoint antes de criar o indice unico.')
      return
    }
    throw err
  }
}

const main = async () => {
  console.log(`Conectando em ${safeUri}`)
  console.log(`Banco: ${DB_NAME}\n`)

  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 })

  try {
    await client.connect()
    const db = client.db(DB_NAME)

    console.log('push_subscriptions:')
    await ensureCollection(db, 'push_subscriptions')
    // Um endpoint identifica um navegador/dispositivo: precisa ser unico para o
    // upsert de /api/push/subscribe nao criar linhas duplicadas.
    await ensureIndex(db, 'push_subscriptions', { endpoint: 1 }, { unique: true })

    console.log('\nscheduled_notifications:')
    await ensureCollection(db, 'scheduled_notifications')
    // Usado pelo scheduler a cada 60s para achar os jobs vencidos.
    await ensureIndex(db, 'scheduled_notifications', { status: 1, nextRunAt: 1 })

    // Resumo do que ficou no banco.
    const subsCount = await db.collection('push_subscriptions').countDocuments({})
    const jobsCount = await db.collection('scheduled_notifications').countDocuments({})
    console.log('\nEstado atual:')
    console.log(`  push_subscriptions: ${subsCount} documento(s)`)
    console.log(`  scheduled_notifications: ${jobsCount} documento(s)`)
    console.log('\nPronto.')
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error('\nFalhou:', err?.message || err)
  process.exit(1)
})
