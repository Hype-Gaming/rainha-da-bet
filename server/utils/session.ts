import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

export const SESSION_COOKIE = 'rdb_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export interface UserSession {
  accessToken: string
  user: { id: string; email: string; name: string }
  brandSlug: string
  baseDomain: string
  expiresAt: number
}

function sessionSecret(): string {
  const secret = useRuntimeConfig().sessionSecret as string
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('SESSION_SECRET é obrigatório em produção')
  }
  return secret || 'dev-session-secret-change-me'
}

function seal(data: UserSession): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function unseal(value: string): UserSession | null {
  const dot = value.indexOf('.')
  if (dot < 0) return null
  const payload = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as UserSession
    if (!data.accessToken || !data.expiresAt) return null
    if (Date.now() > data.expiresAt) return null
    return data
  } catch {
    return null
  }
}

export function getUserSession(event: H3Event): UserSession | null {
  const raw = getCookie(event, SESSION_COOKIE)
  if (!raw) return null
  return unseal(raw)
}

export function setSession(event: H3Event, session: UserSession) {
  setCookie(event, SESSION_COOKIE, seal(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export function clearUserSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export function requireSession(event: H3Event): UserSession {
  const session = getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })
  }
  return session
}

/**
 * Headers para o proxy velvet. A `x-api-key` é credencial da CASA, não do
 * usuário: só pode existir no servidor, nunca no browser.
 */
export function routesAuthHeaders(session: UserSession): Record<string, string> {
  const apiKey = useRuntimeConfig().velvetApiKey as string
  if (!apiKey) throw createError({ statusCode: 500, statusMessage: 'VELVET_API_KEY nao configurada' })
  return {
    Authorization: `Bearer ${session.accessToken}`,
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
  }
}
