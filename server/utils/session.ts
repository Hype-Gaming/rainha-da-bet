import type { H3Event } from 'h3'
import { deriveKey, signPayload, verifyPayload } from './signing'

// Sessão do usuário do app — emitida pelo NOSSO servidor após ele verificar,
// contra o Cactus, o token que o navegador apresentou (ver server/api/auth/session.post.ts).
//
// A regra que este arquivo existe para garantir: nenhum endpoint deve descobrir
// QUEM é o usuário lendo o body ou a query. A identidade vem daqui, e só daqui.

const COOKIE_NAME = 'rdb_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

export interface UserSession {
  email: string
  name: string | null
  phone: string | null
  brandSlug: string
  cactusUserId: number | null
  exp: number
}

let warnedAboutSecret = false

/**
 * Segredo de assinatura da sessão de usuário.
 *
 * O ideal é SESSION_SECRET no .env. Como o deploy já roda com ADMIN_PASSWORD
 * obrigatório, há um fallback derivado dele para o app não subir sem sessão nenhuma
 * (o que deixaria todo mundo trancado para fora do conteúdo). A derivação usa um
 * rótulo próprio, então a chave da sessão de usuário NÃO é a mesma da sessão de admin.
 */
const getSecret = (): string => {
  const explicit = process.env.SESSION_SECRET
  if (explicit) return explicit

  const root = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
  if (!root) return ''

  if (!warnedAboutSecret) {
    warnedAboutSecret = true
    console.warn(
      '[session] SESSION_SECRET não definido — usando chave derivada de ADMIN_PASSWORD. ' +
      'Defina SESSION_SECRET no .env: trocar a senha do admin desloga todos os usuários.'
    )
  }

  return deriveKey(root, 'rdb:user-session:v1')
}

/** Grava o cookie de sessão. Só é chamado depois que a identidade foi VERIFICADA. */
export const setUserSession = (
  event: H3Event,
  data: Omit<UserSession, 'exp'>,
  now = Date.now()
): void => {
  const secret = getSecret()
  if (!secret) {
    throw createError({ statusCode: 500, message: 'Sessão não configurada no servidor' })
  }

  const session: UserSession = { ...data, email: data.email.trim().toLowerCase(), exp: now + SESSION_TTL_MS }

  setCookie(event, COOKIE_NAME, signPayload(session, secret), {
    httpOnly: true,                                   // invisível para o JavaScript da página
    sameSite: 'lax',                                  // o navegador não manda o cookie em POST cross-site (anti-CSRF)
    secure: process.env.NODE_ENV === 'production',    // só trafega por HTTPS em produção
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  })
}

export const clearUserSession = (event: H3Event): void => {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

/** Lê e valida a sessão do cookie. Retorna null se ausente, adulterada ou expirada. */
export const getUserSession = (event: H3Event, now = Date.now()): UserSession | null => {
  const secret = getSecret()
  if (!secret) return null

  const session = verifyPayload<UserSession>(getCookie(event, COOKIE_NAME), secret)
  if (!session?.email || !session.exp || session.exp < now) return null

  return session
}

/**
 * Exige uma sessão válida. Lança 401 com `data.needSession` para o cliente saber
 * que deve refazer a troca de token em vez de mandar o usuário para a tela de login.
 */
export const requireUser = (event: H3Event): UserSession => {
  const session = getUserSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Sessão inválida ou expirada',
      data: { needSession: true }
    })
  }

  return session
}
