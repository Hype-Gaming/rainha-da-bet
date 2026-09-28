import { DEFAULT_BRAND, getBrand } from '../../../shared/brands'
import { setSession, type UserSession } from '../../utils/session'

interface LoginBody {
  email?: string
  password?: string
  brand_slug?: string
  base_domain?: string
}

/** Corpo de POST /auth/login no velvet. */
interface VelvetAuth {
  user: { id?: string; email?: string; name?: string | null }
  session?: { token: string; expiresIn?: number }
}

function isInvalidCredentials(error: any): boolean {
  // O velvet repassa o corpo do Hydra; no /auth/login um 401 do Hydra só
  // acontece por e-mail/senha errados. Mas 401 tambem e o codigo de
  // PROXY_API_KEY_INVALID — erro de configuracao nosso, nao do usuario.
  const code = error?.data?.error_code || error?.response?._data?.error_code
  if (code === 'PROXY_API_KEY_INVALID') return false
  const status = error?.response?.status || error?.statusCode
  return status === 401
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const email = body?.email?.trim()
  const password = body?.password
  const requestedBrand = body?.brand_slug?.trim() || DEFAULT_BRAND.slug
  const brand = getBrand(requestedBrand)

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'E-mail/CPF e senha são obrigatórios.' })
  }
  if (brand.slug !== requestedBrand || body?.base_domain !== brand.baseDomain) {
    throw createError({ statusCode: 400, statusMessage: 'Marca inválida.' })
  }

  const config = useRuntimeConfig()
  const routesApi = config.public.routesApiBase as string

  try {
    const res = await $fetch<VelvetAuth>(`${routesApi}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.velvetApiKey as string,
      },
      body: { email, password },
    })

    const accessToken = res.session?.token
    if (!accessToken) {
      throw createError({ statusCode: 502, statusMessage: 'Login sem token de sessao' })
    }

    const expiresIn = Number(res.session?.expiresIn) || 86400
    const session: UserSession = {
      accessToken,
      user: {
        id: String(res.user?.id || ''),
        email: res.user?.email || email,
        name: res.user?.name || '',
      },
      brandSlug: brand.slug,
      baseDomain: brand.baseDomain,
      expiresAt: Date.now() + expiresIn * 1000,
    }

    // O token fica no cookie assinado, httpOnly. O cliente nunca o vê.
    setSession(event, session)

    return { success: true, authenticated: true, user: session.user, brandSlug: brand.slug }
  } catch (e: any) {
    if (e?.statusCode === 502) throw e
    const invalid = isInvalidCredentials(e)
    const upstream = Number(e?.response?.status || e?.statusCode || 0)
    throw createError({
      statusCode: invalid ? 401 : (upstream === 429 ? 429 : (upstream >= 500 || !upstream ? 502 : upstream)),
      statusMessage: invalid ? 'E-mail/CPF ou senha incorretos.' : 'Falha no login',
      data: invalid ? { invalidCredentials: true } : (e?.data || e?.response?._data),
    })
  }
})
