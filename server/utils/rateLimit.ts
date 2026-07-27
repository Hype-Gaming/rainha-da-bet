import type { H3Event } from 'h3'

// Rate limit em memória, por processo.
//
// LIMITAÇÃO CONHECIDA E ACEITA: o estado vive na RAM do processo. Como o PM2 roda
// `instances: 1` em modo fork (ecosystem.config.cjs), há um processo só e a contagem
// é exata. Se algum dia subir para cluster/múltiplas instâncias, cada uma terá sua
// própria contagem e o limite efetivo será N x o configurado — nesse dia, migrar o
// estado para o Mongo ou Redis.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Varredura preguiçosa: sem isso o Map cresce para sempre (um IP novo = uma chave nova),
// o que é um vazamento de memória lento e um vetor de DoS.
let lastSweep = 0
const SWEEP_INTERVAL_MS = 60_000

const sweep = (now: number) => {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * IP do cliente. Atrás de nginx/Cloudflare o socket é sempre 127.0.0.1, então o IP
 * real vem do X-Forwarded-For — que o proxy reverso precisa estar setando.
 */
export const getClientIp = (event: H3Event): string =>
  getRequestIP(event, { xForwardedFor: true }) || 'desconhecido'

export interface RateLimitOptions {
  /** Identificador do bucket. Combine escopo + identidade, ex: `login:1.2.3.4`. */
  key: string
  /** Quantas requisições são permitidas na janela. */
  limit: number
  /** Duração da janela em milissegundos. */
  windowMs: number
  message?: string
}

/** Consome uma unidade do bucket. Lança 429 quando o limite estourou. */
export const rateLimit = (options: RateLimitOptions): void => {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(options.key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs })
    return
  }

  bucket.count += 1

  if (bucket.count > options.limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      message: options.message || 'Muitas tentativas. Tente novamente em instantes.',
      data: { retryAfter }
    })
  }
}

/** Zera o bucket — use após um sucesso, para não punir quem acertou. */
export const resetRateLimit = (key: string): void => {
  buckets.delete(key)
}
