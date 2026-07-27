// Quais alvos do catalogador são liberados para usuário LOGADO sem assinatura.
//
// Fonte da verdade compartilhada entre client e server (mesmo padrão de shared/brands.ts).
// Espelha o bloco "Inteligência Artificial Prime" (primeGames) da home, que é
// renderizado sem cadeado e sem checagem de isSubscribed — é o funil de aquisição:
// o usuário grátis entra, usa o jogo livre e vê valor antes de assinar.
//
// IMPORTANTE: ao promover um jogo de pago para livre (ou o contrário) na home,
// atualize esta lista junto. Se elas divergirem, o app mostra o jogo como livre
// e o servidor responde 403 — sintoma confuso e difícil de rastrear.

export interface CatalogadorTarget {
  collection: string
  game: string
}

/** Alvos liberados sem assinatura. Hoje: Football Studio (primeGames na home). */
export const FREE_CATALOGADOR_TARGETS: CatalogadorTarget[] = [
  { collection: 'evolution', game: 'Football Studio English' }
]

const normalize = (value: string): string => value.trim().toLowerCase()

export const isFreeCatalogadorTarget = (collection: string, game: string): boolean =>
  FREE_CATALOGADOR_TARGETS.some(
    (target) =>
      normalize(target.collection) === normalize(collection) &&
      normalize(target.game) === normalize(game)
  )
