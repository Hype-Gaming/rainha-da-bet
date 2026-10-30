import { GAME_ROUTE_DEFINITIONS } from '../../app/constants/gameRoutes'
import { getDb } from './mongodb'

export const DEFAULT_MINIMUM_CENTS = 1000
export const gameIds = Object.keys(GAME_ROUTE_DEFINITIONS)
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

// Aceita valores monetários explícitos, sem conversão por ponto flutuante.
export function parseMinimum(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,7})(?:[.,]\d{1,2})?$/.test(value)) return null
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function availableMeetsMinimum(value: unknown, minimumCents: number): boolean {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value) || value.length > 100) return false
  const [whole, fraction = ''] = value.split('.')
  const scale = BigInt(10) ** BigInt(Math.max(fraction.length, 2))
  const amount = BigInt(whole) * scale + BigInt((fraction || '0').padEnd(Math.max(fraction.length, 2), '0'))
  return amount >= BigInt(minimumCents) * (scale / BigInt(100))
}

export async function getSignalSettings() {
  const db = await getDb()
  const doc = await db.collection('settings').findOne({ key: 'signal_access' })
  const minimums: Record<string, number> = {}
  for (const id of gameIds) {
    const value = doc?.minimums?.[id]
    minimums[id] = Number.isSafeInteger(value) && value >= 0 && value <= 9999999999 ? value : DEFAULT_MINIMUM_CENTS
  }
  const emails = Array.isArray(doc?.emails) ? doc.emails.filter((v: unknown): v is string => typeof v === 'string').map(normalizeEmail) : []
  return { minimums, emails }
}
