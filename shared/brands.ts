// Fonte única das marcas suportadas no login (Cactus).
// Usado tanto no client (composables) quanto no server (validação admin).
// esportiva e bateu compartilham host e domínio; mudam slug e coleção de usuários.

export interface BrandConfig {
  slug: string
  name: string
  baseDomain: string
  apiBaseUrl: string
  userCollection: string
  // Link de cadastro/afiliado da casa (usado no KYC e em "Criar conta")
  affiliateUrl: string
}

export const BRANDS: BrandConfig[] = [
  {
    slug: 'esportiva',
    name: 'Esportiva',
    baseDomain: 'bet.br',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: 'users_eb',
    affiliateUrl: 'https://esportiva.bet.br/?src=uvsmqnryjtwjvnlaakjynnnrf&utm_source=381780'
  },
  {
    slug: 'bateu',
    name: 'Bateu Bet',
    baseDomain: 'bet.br',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: 'users_bb',
    affiliateUrl: 'https://go.aff.bateu.bet.br/ksjauq7x'
  }
]

export const DEFAULT_BRAND: BrandConfig = BRANDS[0]!

export const getBrand = (slug?: string | null): BrandConfig =>
  BRANDS.find((b) => b.slug === slug) || DEFAULT_BRAND
