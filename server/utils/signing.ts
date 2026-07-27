import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Primitivas de assinatura compartilhadas pela sessão do admin e pela do usuário.
// Ficam em um único lugar porque bug de cripto duplicado é bug que só se corrige pela metade.

/**
 * Compara dois segredos em tempo constante, sem vazar o tamanho.
 *
 * `a === b` sai no primeiro byte diferente: quanto mais prefixo o atacante acerta,
 * mais lenta é a resposta. Com amostragem suficiente isso revela a senha caractere
 * a caractere. Comparar os HMACs (sempre 32 bytes, com chave aleatória por chamada)
 * normaliza o tamanho e elimina o canal de timing.
 */
export const safeCompareSecret = (a: string, b: string): boolean => {
  const key = randomBytes(32)
  const digest = (value: string) => createHmac('sha256', key).update(String(value)).digest()
  return timingSafeEqual(digest(a), digest(b))
}

/** HMAC-SHA256 em base64url. */
export const hmac = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('base64url')

/**
 * Deriva uma subchave a partir de um segredo raiz.
 *
 * Nunca use a MESMA chave para assinar coisas diferentes: se um token de admin e um
 * token de usuário compartilham chave, um token válido de um contexto pode ser aceito
 * no outro. O rótulo (`label`) separa os domínios.
 */
export const deriveKey = (rootSecret: string, label: string): string =>
  hmac(label, rootSecret)

/** Serializa e assina um payload no formato `<base64url>.<assinatura>`. */
export const signPayload = (payload: unknown, secret: string): string => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${hmac(encoded, secret)}`
}

/**
 * Verifica a assinatura e devolve o payload, ou null se o token for inválido.
 * NÃO valida expiração — quem chama decide o que `exp` significa.
 */
export const verifyPayload = <T>(token: string | undefined | null, secret: string): T | null => {
  if (!token || !secret) return null

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  // Assinatura conferida ANTES de desserializar: nunca faça JSON.parse em dados
  // que ainda não foram provados autênticos.
  if (!safeCompareSecret(signature, hmac(encoded, secret))) return null

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
