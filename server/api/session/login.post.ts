import { DEFAULT_BRAND, getBrand } from '../../../shared/brands'

interface LoginBody {
  email?: string
  password?: string
  brand_slug?: string
  base_domain?: string
  app_source?: string
  save_cookies?: boolean
  captchaToken?: string
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
    return await $fetch(`${routesApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brand-Slug': brand.slug,
        'X-Base-Domain': brand.baseDomain
      },
      body: {
        email,
        password,
        brand_slug: brand.slug,
        base_domain: brand.baseDomain,
        app_source: body.app_source || 'web',
        save_cookies: body.save_cookies !== false,
        captcha_token: body.captchaToken || ''
      }
    })
  } catch (error: any) {
    const upstreamStatus = Number(error?.response?.status || error?.statusCode || 0)
    const statusCode = upstreamStatus >= 400 && upstreamStatus < 500
      ? upstreamStatus
      : upstreamStatus === 504 ? 504 : 502
    throw createError({
      statusCode,
      statusMessage: 'Falha no login',
      data: error?.data || error?.response?._data
    })
  }
})
