import type { H3Event } from 'h3'
import { getBrand } from '../../shared/brands'

export interface VerifiedAppUser {
  id: string
  email: string
  name: string
  brandSlug: string
}

export const requireAppUser = async (event: H3Event): Promise<VerifiedAppUser> => {
  const authorization = getHeader(event, 'authorization') || ''
  const cookieKey = getHeader(event, 'x-cactus-cookie-key') || ''
  const requestedBrand = getHeader(event, 'x-brand-slug') || ''
  const brand = getBrand(requestedBrand)

  if (!authorization.startsWith('Bearer ') || !cookieKey || brand.slug !== requestedBrand) {
    throw createError({ statusCode: 401, message: 'Sessão inválida.' })
  }

  try {
    const user = await $fetch<any>(`${brand.apiBaseUrl}/api/auth/user`, {
      params: { collection: brand.userCollection },
      headers: {
        Authorization: authorization,
        'X-Brand-Slug': brand.slug,
        'X-Base-Domain': brand.baseDomain,
        'X-Cactus-Cookie-Key': cookieKey
      }
    })
    const email = String(user?.email || '').trim().toLowerCase()
    if (!email) throw new Error('missing user')
    return { id: String(user.id || email), email, name: String(user.name || ''), brandSlug: brand.slug }
  } catch {
    throw createError({ statusCode: 401, message: 'Sessão expirada.' })
  }
}
