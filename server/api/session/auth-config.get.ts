import { DEFAULT_BRAND, getBrand } from '../../../shared/brands'

const disabledCaptchaConfig = {
  enableCaptcha: false,
  enableCaptchaLogin: false,
  captchaServices: [] as string[],
  turnstileSiteKey: '',
  captchaStyle: 'dark' as const
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedBrand = String(query.brandSlug || DEFAULT_BRAND.slug).trim()
  const brand = getBrand(requestedBrand)
  const baseDomain = String(query.baseDomain || brand.baseDomain).trim()

  // Não permite consultar configurações de tenants fora da allowlist local.
  if (brand.slug !== requestedBrand || baseDomain !== brand.baseDomain) {
    return disabledCaptchaConfig
  }

  const config = useRuntimeConfig()
  const routesApi = config.public.routesApiBase as string

  try {
    const data = await $fetch<any>(`${routesApi}/api/auth-configs`, {
      headers: {
        'X-Brand-Slug': brand.slug,
        'X-Base-Domain': brand.baseDomain
      }
    })
    const payload = data?.data ?? data
    const featureSet = Array.isArray(payload)
      ? payload.find((item: any) => item?.is_default) || payload[0] || {}
      : payload && typeof payload === 'object' ? payload : {}

    let auth = featureSet?.auth_configs ?? {}
    if (typeof auth === 'string') {
      try { auth = JSON.parse(auth) } catch { auth = {} }
    }

    return {
      enableCaptcha: auth?.enable_captcha === true,
      enableCaptchaLogin: auth?.enable_captcha_login === true,
      captchaServices: Array.isArray(auth?.captcha_services) ? auth.captcha_services : [],
      turnstileSiteKey: typeof auth?.turnstile_site_key === 'string' ? auth.turnstile_site_key : '',
      captchaStyle: auth?.captcha_style === 'light' ? 'light' : 'dark'
    }
  } catch {
    return disabledCaptchaConfig
  }
})
