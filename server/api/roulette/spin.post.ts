import { randomInt } from 'node:crypto'
import { getDb } from '../../utils/mongodb'
import { requireAppUser } from '../../utils/appUser'

const PRIZES = [
  { prize: 'bonus-5', label: 'Bônus de R$ 5', weight: 35 },
  { prize: 'bonus-10', label: 'Bônus de R$ 10', weight: 25 },
  { prize: 'ebook', label: 'Material exclusivo', weight: 25 },
  { prize: 'vip', label: '1 dia de acesso VIP', weight: 12 },
  { prize: 'bonus-50', label: 'Bônus de R$ 50', weight: 3 }
]
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date())
const drawPrize = () => {
  let cursor = randomInt(100)
  for (const item of PRIZES) { cursor -= item.weight; if (cursor < 0) return item }
  return PRIZES[0]!
}

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const db = await getDb()
  const spins = db.collection('roulette_spins')
  await spins.createIndex({ user_id: 1, day: 1 }, { unique: true })
  const day = dayKey()
  const existing = await spins.findOne({ user_id: user.id, day })
  if (existing) throw createError({ statusCode: 409, message: 'Você já girou hoje. Volte amanhã.', data: { prize: existing.prize, label: existing.label } })
  const result = drawPrize()
  try {
    await spins.insertOne({ user_id: user.id, email: user.email, brand_slug: user.brandSlug, day, ...result, created_at: new Date() })
  } catch (error: any) {
    if (error?.code === 11000) throw createError({ statusCode: 409, message: 'Você já girou hoje. Volte amanhã.' })
    throw error
  }
  return { prize: result.prize, label: result.label }
})
