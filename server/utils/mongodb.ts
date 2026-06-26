import { MongoClient, type Db } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const DB_NAME = process.env.MONGO_DB_NAME || 'rainha_da_bet'

let client: MongoClient | null = null
let db: Db | null = null

export const getDb = async (): Promise<Db> => {
  if (db) return db

  client = new MongoClient(MONGO_URI)
  await client.connect()
  db = client.db(DB_NAME)

  return db
}
