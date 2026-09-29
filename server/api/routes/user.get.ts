import { requireSession, routesAuthHeaders } from '../../utils/session'

interface VelvetBalance {
  currency: string
  available: string
  locked?: string
  bonus?: string
  totalAvailable?: string
}

/**
 * Perfil + saldo. O velvet separa em /auth/me e /balances; o front consome um
 * objeto só, no formato que a routes-eb devolvia (wallet.credit em centavos),
 * para os componentes existentes não precisarem mudar.
 */
export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const currency = (getQuery(event).currency as string) || 'BRL'

  const config = useRuntimeConfig()
  const routesApi = config.public.routesApiBase as string
  const headers = routesAuthHeaders(session)

  const [me, balances] = await Promise.all([
    $fetch<{ user?: Record<string, unknown> }>(`${routesApi}/auth/me`, { headers }),
    $fetch<{ balances?: VelvetBalance[] }>(`${routesApi}/balances`, { headers }),
  ])

  const wallet = balances.balances?.find((b) => b.currency === currency)
    ?? balances.balances?.[0]

  // O Hydra devolve decimal em string ("10.50"); o front divide por 100.
  // ponytail: float puro — valores com sub-centavo ("1.005") arredondam pra
  // baixo, porque 1.005*100 da 100.49999999999999. Erra no maximo 1 centavo e
  // so na exibicao do saldo. Se precisar de exatidao, parseie a string decimal
  // em vez de multiplicar.
  const toCents = (value: string | undefined) =>
    value === undefined ? 0 : Math.round(Number(value) * 100)

  const user = (me.user || {}) as Record<string, any>

  return {
    id: user.id ?? session.user.id,
    email: user.email ?? session.user.email,
    name: user.name ?? session.user.name,
    phone: user.phone ?? '',
    // O velvet não expõe KYC. Enquanto não expuser, o campo vem null e o
    // cliente não bloqueia nada — quem barra de fato é o start-game.
    kyc_validated_at: user.kyc_validated_at ?? null,
    kyc_known: Object.prototype.hasOwnProperty.call(user, 'kyc_validated_at'),
    wallet: {
      credit: toCents(wallet?.totalAvailable ?? wallet?.available),
      balance: toCents(wallet?.available),
      bonus: toCents(wallet?.bonus),
      locked: toCents(wallet?.locked),
      currency: wallet?.currency ?? currency,
    },
  }
})
