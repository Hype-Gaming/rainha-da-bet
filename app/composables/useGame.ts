import { getGameRouteConfig } from '../constants/gameRoutes'

// Composable para gerenciar jogos e integração com API
const SIGNAL_API_BASE = 'https://api-apps-server.automagroup.com.br'
const UNAVAILABLE_SIGNAL_CONFIGS = new Set<string>()

export interface GameSignalConfig {
  signalUrl: string
  signalName: string
  signalCollection?: string
}

export const useGame = () => {
  const { token, cookieKey, clearAuth, apiBaseUrl, brandSlug, baseDomain } = useAuth()
  
  const gameUrl = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const gameSignalConfig = ref<GameSignalConfig | null>(null)

  /**
   * Busca a configuração de sinais do jogo (signalUrl, signalName, signalCollection)
   * a partir da API que lê o MongoDB de sinais
   */
  const fetchGameConfig = async (gameId: string): Promise<GameSignalConfig | null> => {
    const ref = getGameRouteConfig(gameId).signalRef
    if (!ref) return null

    const configKey = `${ref.collection}/${ref.name}`
    if (UNAVAILABLE_SIGNAL_CONFIGS.has(configKey)) {
      const fallback: GameSignalConfig = {
        signalUrl: 'wss://ws-signals.grupoautoma.com/ws',
        signalName: ref.name,
        signalCollection: ref.collection
      }
      gameSignalConfig.value = fallback
      return fallback
    }

    try {
      const response = await $fetch<any>(
        `${SIGNAL_API_BASE}/api/game-config/${ref.collection}/${ref.name}`
      )

      const wss = response?.sinais_wss
      if (!wss?.signalUrl || !wss?.signalName) return null

      const config: GameSignalConfig = {
        signalUrl: wss.signalUrl,
        signalName: wss.signalName,
        signalCollection: wss.signalCollection ?? undefined
      }

      gameSignalConfig.value = config
      return config
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.response?.status === 404) {
        UNAVAILABLE_SIGNAL_CONFIGS.add(configKey)
      }
      // Fallback: usa config padrão embutido caso a API falhe
      if (!ref) return null

      const fallback: GameSignalConfig = {
        signalUrl: 'wss://ws-signals.grupoautoma.com/ws',
        signalName: ref.name,
        signalCollection: ref.collection
      }
      gameSignalConfig.value = fallback
      return fallback
    }
  }


  const startGame = async (gameId: string, platform: 'WEB' | 'MOBILE' = 'WEB'): Promise<string | null> => {
    if (!token.value) {
      error.value = 'Usuário não autenticado'
      return null
    }

    const slug = getGameRouteConfig(gameId).startGameSlug
    if (!slug) {
      error.value = 'Jogo não encontrado'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        success: boolean
        game_url?: string
        payload?: {
          error: boolean
          description: string
          gameURL?: string
          launchOptions?: {
            game_url?: string
          }
        }
        message?: string
      }>(`${apiBaseUrl.value}/api/start-game`, {
        method: 'GET',
        params: {
          slug,
          platform,
          use_demo: 0
        },
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'X-Brand-Slug': brandSlug.value,
          'X-Base-Domain': baseDomain.value,
          'X-Cactus-Cookie-Key': String(cookieKey.value || '')
        }
      })

      if (response.success && response.game_url) {
        gameUrl.value = response.game_url
        return response.game_url
      }

      // Tenta pegar do payload se não veio direto
      if (response.payload?.gameURL) {
        gameUrl.value = response.payload.gameURL
        return response.payload.gameURL
      }

      if (response.payload?.launchOptions?.game_url) {
        gameUrl.value = response.payload.launchOptions.game_url
        return response.payload.launchOptions.game_url
      }

      error.value = response.message || 'Erro ao iniciar jogo'
      return null
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        clearAuth()
        return null
      }
      console.error('Erro ao iniciar jogo:', err)
      error.value = err.data?.message || err.message || 'Erro ao iniciar jogo'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Retorna o slug da API para um jogo
   */
  const getGameSlug = (gameId: string): string | null => {
    return getGameRouteConfig(gameId).startGameSlug || null
  }

  /**
   * Verifica se um jogo está disponível
   */
  const isGameAvailable = (gameId: string): boolean => {
    return !!getGameRouteConfig(gameId).startGameSlug
  }

  return {
    gameUrl,
    isLoading,
    error,
    gameSignalConfig,
    startGame,
    fetchGameConfig,
    getGameSlug,
    isGameAvailable
  }
}
