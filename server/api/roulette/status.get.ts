import { getDb } from '../../utils/mongodb'
import { requireAppUser } from '../../utils/appUser'

const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date())

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const db = await getDb()
  const spin = await db.collection('roulette_spins').findOne({ user_id: user.id, day: dayKey() })
  return { canSpin: !spin, spin: spin ? { prize: spin.prize, label: spin.label, spunAt: spin.created_at } : null }
})
