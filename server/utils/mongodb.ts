import { arch, platform, release, type as osType } from 'node:os'
import { MongoClient, type Db } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const DB_NAME = process.env.MONGO_DB_NAME || 'rainha_da_bet'

// O driver 7.x chama `require('os')` dentro de `new MongoClient` (resolveRuntimeAdapters).
// No bundle ESM que o Nitro gera, `require` não existe — e TODO endpoint que toca o
// banco estoura 500 em runtime com "ReferenceError: require is not defined".
//
// O próprio driver prevê isso: `runtimeAdapters` deixa injetar as funções do `os`
// explicitamente, e aí ele não precisa do require. É a via suportada, e não depende
// de configuração do bundler para continuar funcionando.
const RUNTIME_ADAPTERS = {
  os: { release, platform, arch, type: osType }
}

// Cacheamos a PROMESSA, não o resultado.
//
// Com `if (db) return db`, duas requisições que chegam juntas no boot passam as
// duas pelo if (nenhuma terminou de conectar ainda) e criam dois MongoClient —
// a primeira conexão vaza, sem ninguém para fechá-la. Guardar a promessa faz a
// segunda requisição esperar a conexão que já está em andamento.
let dbPromise: Promise<Db> | null = null

const connect = async (): Promise<Db> => {
  const client = new MongoClient(MONGO_URI, { runtimeAdapters: RUNTIME_ADAPTERS })
  try {
    await client.connect()
    return client.db(DB_NAME)
  } catch (err) {
    // Limpa o cache para a próxima chamada tentar de novo, em vez de ficar presa
    // para sempre a uma promessa rejeitada.
    dbPromise = null
    await client.close().catch(() => {})
    throw err
  }
}

export const getDb = (): Promise<Db> => {
  if (!dbPromise) dbPromise = connect()
  return dbPromise
}
