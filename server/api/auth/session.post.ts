import { getBrand } from '../../../shared/brands'
import { setUserSession } from '../../utils/session'
import { getClientIp, rateLimit } from '../../utils/rateLimit'

// TROCA DE TOKEN (token exchange).
//
// O login continua sendo navegador -> Cactus, exatamente como antes. Este endpoint
// entra DEPOIS: o navegador apresenta o token que recebeu e o servidor pergunta ao
// Cactus de quem ele é. O passo que importa é esse — o servidor VERIFICA em vez de
// acreditar. Só então emite o cookie de sessão.
//
// Sem isso, todo endpoint nosso é obrigado a confiar no e-mail que o cliente digitar.

interface CactusProfile {
  id?: number
  email?: string
  name?: string
  phone?: string
}

export default defineEventHandler(async (event) => {
  // A verificação custa uma chamada ao Cactus. Sem limite, vira alavanca de DoS
  // contra o Cactus usando o nosso servidor como amplificador.
  rateLimit({
    key: `auth-session:${getClientIp(event)}`,
    limit: 20,
    windowMs: 5 * 60 * 1000
  })

  const body = await readBody(event)
  const token = String(body?.token || '').trim()
  const cookieKey = String(body?.cookieKey || '').trim()
  const brand = getBrand(body?.brandSlug)

  if (!token || !cookieKey) {
    throw createError({ statusCode: 400, message: 'Token e cookieKey são obrigatórios' })
  }

  let profile: CactusProfile
  try {
    profile = await $fetch<CactusProfile>(`${brand.apiBaseUrl}/api/auth/user`, {
      method: 'GET',
      params: { collection: brand.userCollection },
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Brand-Slug': brand.slug,
        'X-Base-Domain': brand.baseDomain,
        'X-Cactus-Cookie-Key': cookieKey
      }
    })
  } catch {
    // Token que o Cactus não reconhece: não existe sessão a emitir.
    throw createError({ statusCode: 401, message: 'Token não reconhecido' })
  }

  const email = String(profile?.email || '').trim().toLowerCase()
  if (!email) {
    throw createError({ statusCode: 401, message: 'Perfil sem e-mail' })
  }

  // Identidade confirmada pelo Cactus — daqui em diante ela é confiável.
  setUserSession(event, {
    email,
    name: profile.name ? String(profile.name).trim() : null,
    phone: profile.phone ? String(profile.phone).trim() : null,
    brandSlug: brand.slug,
    cactusUserId: typeof profile.id === 'number' ? profile.id : null
  })

  return { ok: true, email }
})
