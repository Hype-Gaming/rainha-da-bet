import type { H3Event } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Auth do painel admin — INDEPENDENTE do Cactus.
// Login = e-mail (na allowlist ADMIN_EMAILS) + senha (ADMIN_PASSWORD), ambos do .env.
// A sessão é um token assinado por HMAC (sem banco): payload.assinatura.

const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h

const getAdminEmails = (): string[] =>
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

// Segredo para assinar a sessão. Usa ADMIN_SESSION_SECRET se existir; senão a própria senha
// (trocar a senha invalida todas as sessões — efeito desejado).
const getSecret = (): string => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''

const sign = (payloadB64: string, secret: string): string =>
  createHmac('sha256', secret).update(payloadB64).digest('base64url')

export const isAdminEmail = (email: string): boolean =>
  getAdminEmails().includes(email.trim().toLowerCase())

/** Confere e-mail (allowlist) + senha (.env). Falha se a auth não estiver configurada. */
export const validateAdminCredentials = (email: string, password: string): boolean => {
  const emails = getAdminEmails()
  const expectedPw = process.env.ADMIN_PASSWORD || ''
  if (!emails.length || !expectedPw) return false
  return emails.includes(email.trim().toLowerCase()) && password === expectedPw
}

/** Emite um token de sessão assinado para o admin. */
export const issueAdminToken = (email: string, now = Date.now()): string => {
  const payload = { email: email.trim().toLowerCase(), exp: now + SESSION_TTL_MS }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${payloadB64}.${sign(payloadB64, getSecret())}`
}

/** Verifica o token; retorna o e-mail do admin ou null se inválido/expirado. */
export const verifyAdminToken = (token: string | undefined, now = Date.now()): string | null => {
  const secret = getSecret()
  if (!token || !secret) return null

  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null

  const expected = sign(payloadB64, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let payload: { email?: string; exp?: number }
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (!payload.exp || payload.exp < now) return null
  const email = String(payload.email || '').trim().toLowerCase()
  if (!email || !isAdminEmail(email)) return null

  return email
}

/**
 * Exige uma sessão de admin válida (token no header Authorization: Bearer ...).
 * Lança 401 (com data.needLogin) se ausente/inválida. Retorna o e-mail do admin.
 */
export const requireAdmin = async (event: H3Event): Promise<string> => {
  const authorization = getHeader(event, 'authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  const email = verifyAdminToken(token)

  if (!email) {
    throw createError({ statusCode: 401, message: 'Não autenticado', data: { needLogin: true } })
  }

  return email
}
