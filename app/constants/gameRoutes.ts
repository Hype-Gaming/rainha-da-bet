export interface GameCatalogadorConfig {
  collection: string
  game: string
  fallbackGames?: string[]
}

export interface GameSignalRef {
  collection: string
  name: string
}

export interface GameRouteDefinition {
  id: string
  displayName: string
  provider: string
  resolvedId?: string
  startGameSlug?: string
  catalogador?: GameCatalogadorConfig
  signalRef?: GameSignalRef
}

const DEFAULT_GAME_ID = 'bac-bo'

export const GAME_ROUTE_DEFINITIONS: Record<string, GameRouteDefinition> = {
  'bac-bo': {
    id: 'bac-bo',
    displayName: 'Bac Bo',
    provider: 'Evolution',
    startGameSlug: 'evolution/bac-bo-ao-vivo',
    catalogador: {
      collection: 'evolution',
      game: 'Bac Bo',
      fallbackGames: ['Bac Bo English']
    },
    signalRef: { collection: 'bac_bo_english', name: 'bac-bo-ao-vivo-hypeg1' }
  },
  'bac-bo-en': {
    id: 'bac-bo-en',
    displayName: 'Bac Bo EN',
    provider: 'Evolution',
    startGameSlug: 'evolution/bac-bo',
    catalogador: {
      collection: 'evolution',
      game: 'Bac Bo English'
    },
    signalRef: { collection: 'bac_bo_english', name: 'bac-bo-hypeg2' }
  },
  'bac-bo-brasileiro': {
    id: 'bac-bo-brasileiro',
    displayName: 'Bac Bo Brasileiro',
    provider: 'Evolution',
    resolvedId: 'bac-bo',
    catalogador: {
      collection: 'evolution',
      game: 'Bac Bo Brasileiro',
      fallbackGames: ['Bac Bo English']
    },
    signalRef: { collection: 'bac_bo_ao_vivo', name: 'bac-bo-ao-vivo-hypeg1' }
  },
  'bac-bo-sem-gale': {
    id: 'bac-bo-sem-gale',
    displayName: 'Bac Bo - Sinal Sem Gale',
    provider: 'Evolution',
    resolvedId: 'bac-bo-en',
    catalogador: {
      collection: 'evolution',
      game: 'Bac Bo Sem Gale',
      fallbackGames: ['Bac Bo English']
    },
    signalRef: { collection: 'bac_bo_sem_gale', name: 'bac-bo-ao-vivo-hypeg0' }
  },
  'football-studio': {
    id: 'football-studio',
    displayName: 'Football Studio',
    provider: 'Evolution',
    startGameSlug: 'evolution/football-studio',
    catalogador: {
      collection: 'evolution',
      game: 'Football Studio English'
    },
    signalRef: { collection: 'football_studio_english', name: 'football-studio-eng-default' }
  },
  'football-studio-ao-vivo': {
    id: 'football-studio-ao-vivo',
    displayName: 'Futebol Studio Ao Vivo',
    provider: 'Evolution',
    startGameSlug: 'evolution/futebol-studio-ao-vivo',
    catalogador: {
      collection: 'evolution',
      game: 'Futebol Studio Ao Vivo'
    },
    signalRef: { collection: 'futebol_studio_ao_vivo', name: 'football-studio-ao-vivo-default' }
  },
  'dragon-tiger': {
    id: 'dragon-tiger',
    displayName: 'Dragon Tiger',
    provider: 'Evolution',
    startGameSlug: 'evolution/dragon-tiger',
    catalogador: {
      collection: 'evolution',
      game: 'Dragon Tiger'
    },
    signalRef: {
      collection: 'dragon_tiger_evolution',
      name: 'dragon-tiger-evo-hypeg1'
    }
  },
  'aviator': {
    id: 'aviator',
    displayName: 'Aviator',
    provider: 'Spribe',
    startGameSlug: 'spribe/aviator',
    catalogador: {
      collection: 'spribe',
      game: 'aviatorlotogreen'
    },
    signalRef: { collection: 'aviator_spribe', name: 'aviator-spribe-hypeg1' }
  },
  'baccarat': {
    id: 'baccarat',
    displayName: 'Baccarat',
    provider: 'Evolution',
    startGameSlug: 'evolution/bacara-rapido',
    catalogador: {
      collection: 'evolution',
      game: 'Speed Baccarat A',
      fallbackGames: ['Baccarat', 'Speed Baccarat', 'Baccarat A']
    },
    signalRef: {
      collection: 'baccarat',
      name: 'speed-baccarat-a-hypeg1'
    }
  }
}

export const resolveGameRouteId = (gameId: string): string => {
  return GAME_ROUTE_DEFINITIONS[gameId]?.resolvedId || gameId
}

export const getGameRouteConfig = (gameId: string): GameRouteDefinition => {
  const routeConfig = GAME_ROUTE_DEFINITIONS[gameId]
  const resolvedId = resolveGameRouteId(gameId)
  const baseConfig = GAME_ROUTE_DEFINITIONS[resolvedId] || GAME_ROUTE_DEFINITIONS[DEFAULT_GAME_ID]

  return {
    ...baseConfig,
    ...routeConfig,
    id: gameId,
    displayName: routeConfig?.displayName || baseConfig.displayName,
    provider: routeConfig?.provider || baseConfig.provider,
    resolvedId,
    startGameSlug: routeConfig?.startGameSlug || baseConfig.startGameSlug,
    catalogador: routeConfig?.catalogador || baseConfig.catalogador,
    signalRef: routeConfig?.signalRef || baseConfig.signalRef
  }
}

export const getCatalogadorQueries = (gameId: string): Array<{ collection: string; game: string }> => {
  const catalogador = getGameRouteConfig(gameId).catalogador
  if (!catalogador) return []

  const games = [catalogador.game, ...(catalogador.fallbackGames || [])]
  return Array.from(new Set(games)).map((game) => ({
    collection: catalogador.collection,
    game
  }))
}
