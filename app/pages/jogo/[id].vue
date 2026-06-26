<template>
  <div class="jogo-page" :style="themeStyles" :class="{ 'aviator-theme': isAviator }">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="game-indicator">
          <Icon name="ph:circle-fill" class="status-dot" />
        </div>
        <h1 class="game-title">{{ currentGame.name }} - {{ currentGame.provider }}</h1>
      </div>
      <div class="header-right">
        <NuxtLink to="/" class="btn-close">
          <Icon name="ph:x-bold" />
          {{ catalogadorUi.closeLabel }}
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Botão para abrir painel no mobile -->
      <button class="open-panel-btn" @click="sidebarOpen = true">
        <Icon name="ph:chart-bar-bold" />
      </button>

      <!-- Overlay para fechar sidebar no mobile -->
      <div 
        v-if="sidebarOpen" 
        class="sidebar-overlay" 
        @click="sidebarOpen = false"
      ></div>

      <!-- Sidebar - Histórico e Estratégias (Flutuante) -->
      <aside class="sidebar" :class="{ visible: sidebarOpen }">
        <!-- Botão fechar no mobile -->
        <button class="close-sidebar-btn" @click="sidebarOpen = false">
          <Icon name="ph:x-bold" />
        </button>

        <!-- Histórico -->
        <div class="panel">
          <div class="panel-header">
            <Icon name="ph:clock-counter-clockwise-bold" />
            <h2>{{ catalogadorUi.historyTitle }}</h2>
          </div>

          <!-- Possível Entrada -->
          <div v-if="gameMode === 'sinais'" class="possivel-entrada-section" :style="{ border: `2px solid ${valuePrimaryColor}`, boxShadow: `0 6px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px ${valuePrimaryColor}40` }">
            <div class="possivel-entrada-header" :style="{ background: headerGradient, borderBottom: `2px solid ${valueSecondaryColor}` }">
            </div>
            <div class="possivel-entrada-content">
              <div class="entrada-indicator">
                <div v-if="!sinal" class="entrada-message">{{ catalogadorUi.signalTitle }}</div>
                <transition name="fade" mode="out-in">
                  <div v-if="isLoadingSinal && !sinal" class="loading-spinner" key="loading-sinal">
                    <Icon name="ph:spinner-bold" class="spinner" :style="{ color: valuePrimaryColor }" />
                  </div>
                  <div v-else-if="sinal" class="sinal-value" key="sinal-value" :style="{ color: valueAccentColor }">{{ sinal }}</div>
                  <div v-else class="sinal-value aguardando" key="aguardando">{{ catalogadorUi.waitingLabel }}</div>
                </transition>
              </div>
            </div>
          </div>

          <!-- Filtros -->
          <div class="filters-section" :class="{ 'aviator-catalogador': isAviator }">
            <template v-if="isAviator">
              <div class="filter-group filter-group-colors">
                <label>Filtrar por cor:</label>
                <div class="filter-buttons aviator-filter-buttons">
                  <button 
                    class="filter-btn all" 
                    :class="{ active: colorFilter === 'all' }"
                    @click="colorFilter = 'all'"
                  >
                    Todos
                  </button>
                  <button 
                    class="filter-btn player" 
                    :class="{ active: colorFilter === 'Player' }"
                    @click="colorFilter = 'Player'"
                  >
                    <span class="color-dot player"></span>
                    {{ getFilterLabel('Player') }}
                  </button>
                  <button 
                    class="filter-btn banker" 
                    :class="{ active: colorFilter === 'Banker' }"
                    @click="colorFilter = 'Banker'"
                  >
                    <span class="color-dot banker"></span>
                    {{ getFilterLabel('Banker') }}
                  </button>
                  <button 
                    class="filter-btn tie" 
                    :class="{ active: colorFilter === 'Tie' }"
                    @click="colorFilter = 'Tie'"
                  >
                    <span class="color-dot tie"></span>
                    {{ getFilterLabel('Tie') }}
                  </button>
                </div>
              </div>

              <div class="filter-row aviator-filter-row">
                <div class="filter-group filter-group-date">
                  <label>Data:</label>
                  <select v-model="dateFilter" class="filter-select">
                    <option value="all">Todas</option>
                    <option v-for="date in availableDates" :key="date" :value="date">
                      {{ formatDate(date) }}
                    </option>
                  </select>
                </div>

                <div class="filter-group filter-group-rounds">
                  <label>Rodadas:</label>
                  <select v-model="roundsLimit" class="filter-select">
                    <option :value="10">10</option>
                    <option :value="20">20</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                    <option :value="200">200</option>
                    <option :value="500">500</option>
                    <option :value="1000">1000</option>
                  </select>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="filter-row">
                <div class="filter-group">
                  <label>Filtrar por cor:</label>
                  <div class="filter-buttons">
                    <button 
                      class="filter-btn all" 
                      :class="{ active: colorFilter === 'all' }"
                      @click="colorFilter = 'all'"
                    >
                      Todos
                    </button>
                    <button 
                      class="filter-btn player" 
                      :class="{ active: colorFilter === 'Player' }"
                      @click="colorFilter = 'Player'"
                    >
                      <span class="color-dot player"></span>
                      {{ getFilterLabel('Player') }}
                    </button>
                    <button 
                      class="filter-btn banker" 
                      :class="{ active: colorFilter === 'Banker' }"
                      @click="colorFilter = 'Banker'"
                    >
                      <span class="color-dot banker"></span>
                      {{ getFilterLabel('Banker') }}
                    </button>
                    <button 
                      class="filter-btn tie" 
                      :class="{ active: colorFilter === 'Tie' }"
                      @click="colorFilter = 'Tie'"
                    >
                      <span class="color-dot tie"></span>
                      {{ getFilterLabel('Tie') }}
                    </button>
                  </div>
                </div>

                <div class="filter-group">
                  <label>Data:</label>
                  <select v-model="dateFilter" class="filter-select">
                    <option value="all">Todas as datas</option>
                    <option v-for="date in availableDates" :key="date" :value="date">
                      {{ formatDate(date) }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="filter-group">
                <label>Quantidade de rodadas:</label>
                <select v-model="roundsLimit" class="filter-select">
                  <option :value="10">10 rodadas</option>
                  <option :value="20">20 rodadas</option>
                  <option :value="50">50 rodadas</option>
                  <option :value="100">100 rodadas</option>
                  <option :value="200">200 rodadas</option>
                  <option :value="500">500 rodadas</option>
                  <option :value="1000">1000 rodadas</option>
                </select>
              </div>
            </template>
          </div>

          <!-- Resultados -->
          <div class="results-section">
            <div class="results-header">
              <span>{{ catalogadorUi.resultsTitle }}</span>
              <span class="results-count">{{ resultsCountLabel }}</span>
            </div>

            <!-- Loading resultados -->
            <div v-if="isLoadingResults" class="results-loading">
              <Icon name="ph:spinner-bold" class="spinner" />
              <span>{{ catalogadorUi.resultsLoadingLabel }}</span>
            </div>

            <!-- Grid de resultados -->
            <div v-else class="results-grid" :class="{ 'aviator-results-grid': isAviator }">
              <div 
                v-for="(result, index) in filteredResults" 
                :key="index"
                class="result-item"
                :class="[getWinnerClass(result.winner), { 'aviator-result-item': isAviator }]"
                :title="`${getWinnerLabel(result.winner)} - ${result.Hora}`"
              >
                <span class="result-letter" :class="{ 'result-score': shouldUseScoreDisplay(result) }">{{ getResultDisplay(result) }}</span>
              </div>
            </div>

            <!-- Estatísticas rápidas -->
            <div class="results-stats">
              <div class="stat-item player">
                <span class="stat-color"></span>
                <span class="stat-label">{{ outcomeMeta.player.label }}:</span>
                <span class="stat-value">{{ stats.player }}</span>
                <span class="stat-percent">({{ stats.playerPercent }}%)</span>
              </div>
              <div class="stat-item banker">
                <span class="stat-color"></span>
                <span class="stat-label">{{ outcomeMeta.banker.label }}:</span>
                <span class="stat-value">{{ stats.banker }}</span>
                <span class="stat-percent">({{ stats.bankerPercent }}%)</span>
              </div>
              <div class="stat-item tie">
                <span class="stat-color"></span>
                <span class="stat-label">{{ outcomeMeta.tie.label }}:</span>
                <span class="stat-value">{{ stats.tie }}</span>
                <span class="stat-percent">({{ stats.tiePercent }}%)</span>
              </div>
            </div>
          </div>

          <!-- Estatísticas Avançadas -->
          <div class="advanced-stats-section">
            <div class="advanced-stats-header">
              <Icon name="ph:chart-bar-bold" />
              <span>{{ catalogadorUi.statsTitle }}</span>
            </div>

            <div class="advanced-stats-grid">
              <!-- Máximas -->
              <div class="stats-card">
                <div class="stats-card-title">
                  <Icon name="ph:trophy-bold" />
                  <span>Máximas</span>
                </div>
                <div class="stats-card-items">
                  <div class="stats-row player">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.player.label }}</span>
                    <span class="stats-number">{{ advancedStats.maxPlayer }}</span>
                  </div>
                  <div class="stats-row banker">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.banker.label }}</span>
                    <span class="stats-number">{{ advancedStats.maxBanker }}</span>
                  </div>
                  <div class="stats-row tie">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.tie.label }}</span>
                    <span class="stats-number">{{ advancedStats.maxTie }}</span>
                  </div>
                </div>
              </div>

              <!-- Ausências -->
              <div class="stats-card">
                <div class="stats-card-title">
                  <Icon name="ph:clock-countdown-bold" />
                  <span>Ausências</span>
                </div>
                <div class="stats-card-items">
                  <div class="stats-row player">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.player.label }}</span>
                    <span class="stats-number">{{ advancedStats.absencePlayer }}</span>
                  </div>
                  <div class="stats-row banker">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.banker.label }}</span>
                    <span class="stats-number">{{ advancedStats.absenceBanker }}</span>
                  </div>
                  <div class="stats-row tie">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.tie.label }}</span>
                    <span class="stats-number">{{ advancedStats.absenceTie }}</span>
                  </div>
                </div>
              </div>

              <!-- Repetições Atuais -->
              <div class="stats-card">
                <div class="stats-card-title">
                  <Icon name="ph:repeat-bold" />
                  <span>Repetições</span>
                </div>
                <div class="stats-card-items">
                  <div class="stats-row player">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.player.label }}</span>
                    <span class="stats-number">{{ advancedStats.currentPlayer }}</span>
                  </div>
                  <div class="stats-row banker">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.banker.label }}</span>
                    <span class="stats-number">{{ advancedStats.currentBanker }}</span>
                  </div>
                  <div class="stats-row tie">
                    <span class="stats-dot"></span>
                    <span class="stats-name">{{ outcomeMeta.tie.label }}</span>
                    <span class="stats-number">{{ advancedStats.currentTie }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Estratégia Personalizada -->
          <div v-if="!isAviator" class="strategy-section">
            <div class="strategy-header">
              <Icon name="ph:brain-bold" />
              <span>{{ catalogadorUi.strategyTitle }}</span>
              <span class="strategy-badge">TOP G2</span>
            </div>

            <div v-if="isLoadingResults" class="strategy-empty">
              <Icon name="ph:spinner-bold" class="spinner" />
              <span>{{ catalogadorUi.strategyLoadingLabel }}</span>
            </div>

            <div v-else-if="strategies.length === 0" class="strategy-empty no-strategies">
              <Icon name="ph:chart-line-bold" />
              <span>{{ catalogadorUi.noStrategyLabel }}</span>
            </div>

            <div v-else class="strategy-list">
              <div 
                v-for="(strategy, index) in strategies" 
                :key="index"
                class="strategy-item"
              >
                <div class="strategy-pattern">
                  <span class="strategy-icon">{{ strategy.icon }}</span>
                  <span class="strategy-name">{{ strategy.name }}</span>
                </div>
                <div class="strategy-info">
                  <div class="strategy-prediction">
                    <span class="prediction-label">{{ catalogadorUi.predictionLabel }}</span>
                    <span 
                      class="prediction-badge"
                      :class="strategy.prediction.toLowerCase()"
                    >
                      {{ getWinnerLetter(strategy.prediction) }}
                    </span>
                  </div>
                  <div class="strategy-stats">
                    <span 
                      class="stats-badge g2" 
                      :class="{ 
                        'very-high': parseFloat(strategy.winRateG2) >= 95,
                        'high': parseFloat(strategy.winRateG2) >= 90 && parseFloat(strategy.winRateG2) < 95,
                        'medium': parseFloat(strategy.winRateG2) >= 80 && parseFloat(strategy.winRateG2) < 90
                      }"
                    >
                      {{ strategy.winRateG2 }}%
                    </span>
                    <span class="stats-green">{{ strategy.greens }}🟢</span>
                    <span class="stats-red">{{ strategy.reds }}🔴</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="strategy-footer">
              <Icon name="ph:info-bold" />
              <span>{{ strategyFooterLabel }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Game Area - Iframe -->
      <div class="game-area">
        <div class="iframe-container">
          <!-- Loading -->
          <div v-if="isLoadingGame" class="iframe-placeholder loading">
            <Icon name="ph:spinner-bold" class="spinner" />
            <h3>Carregando jogo...</h3>
            <p>Aguarde enquanto preparamos sua sessão</p>
          </div>

          <!-- Erro -->
          <div v-else-if="gameError" class="iframe-placeholder error">
            <Icon name="ph:warning-bold" />
            <h3>Erro ao carregar jogo</h3>
            <p>{{ gameError }}</p>
            <button class="btn-retry" @click="loadGame">
              <Icon name="ph:arrow-clockwise-bold" />
              Tentar novamente
            </button>
          </div>

          <!-- Iframe do jogo -->
          <iframe 
            v-else-if="iframeUrl"
            :src="iframeUrl"
            frameborder="0"
            allowfullscreen
            allow="autoplay; fullscreen"
            class="game-iframe"
          ></iframe>
          
          <!-- Placeholder quando não há URL -->
          <div v-else class="iframe-placeholder">
            <Icon name="ph:game-controller-bold" />
            <h3>{{ catalogadorUi.unavailableTitle }}</h3>
            <p>{{ catalogadorUi.unavailableDescription }}</p>
            <NuxtLink to="/auth/login" class="btn-login">
              <Icon name="ph:sign-in-bold" />
              {{ catalogadorUi.loginLabel }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCatalogadorQueries, getGameRouteConfig, resolveGameRouteId } from '../../constants/gameRoutes'

const route = useRoute()
const { isAuthenticated } = useAuth()
const { startGame, fetchGameConfig, gameSignalConfig, isLoading: isLoadingGame, error: gameError } = useGame()

// ID do jogo baseado na rota
const gameId = computed(() => route.params.id as string || 'bac-bo')
const routeGameConfig = computed(() => getGameRouteConfig(gameId.value))
const resolvedGameId = computed(() => resolveGameRouteId(gameId.value))
const isAviator = computed(() => gameId.value === 'aviator')
const isFootballStudioGame = (gameKey: string) => gameKey === 'football-studio' || gameKey === 'football-studio-ao-vivo'

type CanonicalWinner = 'Player' | 'Banker' | 'Tie'

const outcomeMeta = computed(() => {
  switch (gameId.value) {
    case 'football-studio':
    case 'football-studio-ao-vivo':
      return {
        player: { label: 'Casa', letter: 'C' },
        banker: { label: 'Visitante', letter: 'V' },
        tie: { label: 'Empate', letter: 'E' }
      }
    case 'dragon-tiger':
      return {
        player: { label: 'Dragon', letter: 'D' },
        banker: { label: 'Tiger', letter: 'T' },
        tie: { label: 'Empate', letter: 'E' }
      }
    case 'aviator':
      return {
        player: { label: 'Azul', letter: 'A' },
        banker: { label: 'Roxo', letter: 'R' },
        tie: { label: 'Rosa', letter: 'P' }
      }
    default:
      return {
        player: { label: 'Player', letter: 'P' },
        banker: { label: 'Banker', letter: 'B' },
        tie: { label: 'Tie', letter: 'T' }
      }
  }
})

const catalogadorUi = computed(() => {
  switch (gameId.value) {
    case 'aviator':
      return {
        historyTitle: 'Histórico do Aviator',
        resultsTitle: 'Últimos multiplicadores',
        statsTitle: 'Estatísticas dos voos',
        strategyTitle: 'Estratégias do Aviator',
        resultUnit: 'voos',
        signalTitle: 'Próximo voo',
        waitingLabel: 'AGUARDANDO VOO',
        resultsLoadingLabel: 'Carregando multiplicadores...',
        strategyLoadingLabel: 'Analisando padrões de voo...',
        noStrategyLabel: 'Nenhum padrão de voo com 80%+ encontrado',
        predictionLabel: 'Próxima entrada:',
        closeLabel: 'Fechar Aviator',
        unavailableTitle: 'Aviator indisponível',
        unavailableDescription: 'Faça login para acessar o Aviator',
        loginLabel: 'Entrar para jogar'
      }
    case 'football-studio':
    case 'football-studio-ao-vivo':
      return {
        historyTitle: `Histórico do ${routeGameConfig.value.displayName}`,
        resultsTitle: 'Últimos resultados',
        statsTitle: 'Estatísticas da partida',
        strategyTitle: `Estratégias do ${routeGameConfig.value.displayName}`,
        resultUnit: 'resultados',
        signalTitle: 'Próxima entrada',
        waitingLabel: 'AGUARDANDO PARTIDA',
        resultsLoadingLabel: 'Carregando resultados da partida...',
        strategyLoadingLabel: 'Analisando padrões da partida...',
        noStrategyLabel: 'Nenhum padrão da partida com 80%+ encontrado',
        predictionLabel: 'Próxima entrada:',
        closeLabel: `Fechar ${routeGameConfig.value.displayName}`,
        unavailableTitle: `${routeGameConfig.value.displayName} indisponível`,
        unavailableDescription: `Faça login para acessar o ${routeGameConfig.value.displayName}`,
        loginLabel: 'Entrar para jogar'
      }
    case 'dragon-tiger':
      return {
        historyTitle: 'Histórico do Dragon Tiger',
        resultsTitle: 'Últimas rodadas',
        statsTitle: 'Estatísticas do Dragon Tiger',
        strategyTitle: 'Estratégias do Dragon Tiger',
        resultUnit: 'rodadas',
        signalTitle: 'Próxima batalha',
        waitingLabel: 'AGUARDANDO RODADA',
        resultsLoadingLabel: 'Carregando rodadas...',
        strategyLoadingLabel: 'Analisando padrões do Dragon Tiger...',
        noStrategyLabel: 'Nenhum padrão do Dragon Tiger com 80%+ encontrado',
        predictionLabel: 'Próxima entrada:',
        closeLabel: 'Fechar Dragon Tiger',
        unavailableTitle: 'Dragon Tiger indisponível',
        unavailableDescription: 'Faça login para acessar o Dragon Tiger',
        loginLabel: 'Entrar para jogar'
      }
    case 'baccarat':
      return {
        historyTitle: 'Histórico do Baccarat',
        resultsTitle: 'Últimas rodadas',
        statsTitle: 'Estatísticas do Baccarat',
        strategyTitle: 'Estratégias do Baccarat',
        resultUnit: 'rodadas',
        signalTitle: 'Próxima entrada',
        waitingLabel: 'AGUARDANDO MESA',
        resultsLoadingLabel: 'Carregando rodadas...',
        strategyLoadingLabel: 'Analisando padrões do Baccarat...',
        noStrategyLabel: 'Nenhum padrão do Baccarat com 80%+ encontrado',
        predictionLabel: 'Próxima entrada:',
        closeLabel: 'Fechar Baccarat',
        unavailableTitle: 'Baccarat indisponível',
        unavailableDescription: 'Faça login para acessar o Baccarat',
        loginLabel: 'Entrar para jogar'
      }
    default:
      return {
        historyTitle: `Histórico do ${routeGameConfig.value.displayName}`,
        resultsTitle: 'Últimos resultados',
        statsTitle: 'Estatísticas',
        strategyTitle: 'Estratégia Personalizada',
        resultUnit: 'resultados',
        signalTitle: 'Possível Entrada',
        waitingLabel: 'AGUARDANDO',
        resultsLoadingLabel: 'Carregando resultados...',
        strategyLoadingLabel: 'Analisando padrões...',
        noStrategyLabel: 'Nenhum padrão com 80%+ encontrado',
        predictionLabel: 'Entrada:',
        closeLabel: 'Fechar Jogo',
        unavailableTitle: 'Jogo não disponível',
        unavailableDescription: 'Faça login para acessar o jogo',
        loginLabel: 'Fazer Login'
      }
  }
})

const themeStyles = computed(() => {
  if (gameId.value === 'aviator') {
    return {
      '--accent-color': '#37a7ff',
      '--player-color': '#4285f4',
      '--player-color-soft': 'rgba(66, 133, 244, 0.2)',
      '--player-color-strong': 'rgba(66, 133, 244, 0.45)',
      '--player-text-color': '#60a5fa',
      '--banker-color': '#a855f7',
      '--banker-color-soft': 'rgba(168, 85, 247, 0.2)',
      '--banker-color-strong': 'rgba(168, 85, 247, 0.45)',
      '--banker-text-color': '#c084fc',
      '--tie-color': '#ec4899',
      '--tie-color-soft': 'rgba(236, 72, 153, 0.2)',
      '--tie-color-strong': 'rgba(236, 72, 153, 0.45)',
      '--tie-text-color': '#f472b6'
    }
  }

  if (isFootballStudioGame(gameId.value)) {
    return {
      '--accent-color': '#dc2626',
      '--player-color': '#dc2626',
      '--player-color-soft': 'rgba(220, 38, 38, 0.16)',
      '--player-color-strong': 'rgba(220, 38, 38, 0.42)',
      '--player-text-color': '#ffffff',
      '--banker-color': '#3b82f6',
      '--banker-color-soft': 'rgba(59, 130, 246, 0.16)',
      '--banker-color-strong': 'rgba(59, 130, 246, 0.42)',
      '--banker-text-color': '#ffffff',
      '--tie-color': '#f59e0b',
      '--tie-color-soft': 'rgba(245, 158, 11, 0.16)',
      '--tie-color-strong': 'rgba(245, 158, 11, 0.42)',
      '--tie-text-color': '#111111'
    }
  }

  if (gameId.value === 'dragon-tiger') {
    return {
      '--accent-color': '#ef4444',
      '--player-color': '#ef4444',
      '--player-color-soft': 'rgba(239, 68, 68, 0.16)',
      '--player-color-strong': 'rgba(239, 68, 68, 0.42)',
      '--player-text-color': '#ffffff',
      '--banker-color': '#facc15',
      '--banker-color-soft': 'rgba(250, 204, 21, 0.18)',
      '--banker-color-strong': 'rgba(250, 204, 21, 0.45)',
      '--banker-text-color': '#111111',
      '--tie-color': '#22c55e',
      '--tie-color-soft': 'rgba(34, 197, 94, 0.16)',
      '--tie-color-strong': 'rgba(34, 197, 94, 0.42)',
      '--tie-text-color': '#ffffff'
    }
  }

  if (gameId.value === 'baccarat') {
    return {
      '--accent-color': '#dc2626',
      '--player-color': '#2563eb',
      '--player-color-soft': 'rgba(37, 99, 235, 0.15)',
      '--player-color-strong': 'rgba(37, 99, 235, 0.4)',
      '--player-text-color': '#ffffff',
      '--banker-color': '#dc2626',
      '--banker-color-soft': 'rgba(220, 38, 38, 0.15)',
      '--banker-color-strong': 'rgba(220, 38, 38, 0.4)',
      '--banker-text-color': '#ffffff',
      '--tie-color': '#16a34a',
      '--tie-color-soft': 'rgba(22, 163, 74, 0.15)',
      '--tie-color-strong': 'rgba(22, 163, 74, 0.4)',
      '--tie-text-color': '#ffffff'
    }
  }

  return {
    '--accent-color': '#00a3ff',
    '--player-color': '#3b82f6',
    '--player-color-soft': 'rgba(59, 130, 246, 0.15)',
    '--player-color-strong': 'rgba(59, 130, 246, 0.4)',
    '--player-text-color': '#ffffff',
    '--banker-color': '#ef4444',
    '--banker-color-soft': 'rgba(239, 68, 68, 0.15)',
    '--banker-color-strong': 'rgba(239, 68, 68, 0.4)',
    '--banker-text-color': '#ffffff',
    '--tie-color': '#f97316',
    '--tie-color-soft': 'rgba(249, 115, 22, 0.15)',
    '--tie-color-strong': 'rgba(249, 115, 22, 0.4)',
    '--tie-text-color': '#ffffff'
  }
})

const classifyAviatorByScore = (rawScore: unknown): CanonicalWinner | null => {
  const numericScore = Number.parseFloat(String(rawScore ?? '').replace(',', '.'))

  if (!Number.isFinite(numericScore)) return null
  if (numericScore >= 10) return 'Tie'
  if (numericScore >= 2) return 'Banker'
  return 'Player'
}

const normalizeWinner = (rawWinner: unknown, rawColor: string | undefined, rawScore: unknown, gameKey: string): CanonicalWinner | null => {
  const winner = String(rawWinner ?? '').trim()
  const color = String(rawColor ?? '').trim().toLowerCase()

  if (isFootballStudioGame(gameKey)) {
    if (/^casa$/i.test(winner)) return 'Player'
    if (/^visitante$/i.test(winner)) return 'Banker'
    if (/^empate$/i.test(winner)) return 'Tie'
  }

  if (gameKey === 'dragon-tiger') {
    if (/^red$/i.test(winner)) return 'Player'
    if (/^yellow$/i.test(winner)) return 'Banker'
    if (/^tie$/i.test(winner)) return 'Tie'
  }

  if (gameKey === 'aviator') {
    const scoreWinner = classifyAviatorByScore(rawScore)
    if (scoreWinner) return scoreWinner

    if (color === 'azul') return 'Player'
    if (color === 'roxo') return 'Banker'
    if (color === 'rosa') return 'Tie'
  }

  if (/^player$/i.test(winner)) return 'Player'
  if (/^banker$/i.test(winner)) return 'Banker'
  if (/^tie$/i.test(winner)) return 'Tie'

  return null
}

// URL do iframe carregada da API
const iframeUrl = ref<string>('')

// O catalogador (casino-data.grupoautoma.com) é restrito por IP: só aceita o IP
// do servidor, não o de cada navegador. Por isso o histórico é buscado pelo proxy
// interno /api/catalogador (server/api/catalogador.get.ts), que faz a chamada a
// partir do IP autorizado do servidor.
const CATALOGADOR_ENDPOINT = '/api/catalogador'

// Config do WSS vem da API via fetchGameConfig (useGame)
// gameSignalConfig é populado no loadGame antes de conectar o WS

// Possível Entrada - Variáveis
const gameMode = ref('sinais') // 'sinais' | 'manual'
const valuePrimaryColor = ref('#00a3ff')
const valueSecondaryColor = ref('#0099cc')
const valueAccentColor = ref('#66e0ff')
const headerGradient = computed(() => `linear-gradient(135deg, ${valuePrimaryColor.value} 0%, ${valueSecondaryColor.value} 100%)`)
const message = ref('Possível Entrada')
const sinal = ref('')
const tentativas = ref('')
const greensCount = ref(0)  // número de tentativas/gales
const signalTarget = ref<'Player' | 'Banker' | 'Tie' | ''>('')  // alvo da entrada
const assertividade = ref('')
const isLoadingSinal = ref(false)
let signalWs: WebSocket | null = null
let signalReconnectTimer: ReturnType<typeof setTimeout> | null = null
const SIGNAL_RECONNECT_MS = 3000
let signalWsDestroyed = false

const setSignalFromWsStatus = (data: any) => {
  const status = String(data?.status || '').toLowerCase()
  const payloadMessage = typeof data?.message === 'string' ? data.message : ''
  const greensValue = Number(data?.greens)

  const extractTarget = (msg: string): CanonicalWinner | '' => {
    if (/player/i.test(msg)) return 'Player'
    if (/banker/i.test(msg)) return 'Banker'
    if (/tie/i.test(msg)) return 'Tie'
    if (/casa/i.test(msg)) return 'Player'
    if (/visitante/i.test(msg)) return 'Banker'
    if (/empate/i.test(msg)) return 'Tie'
    if (/red/i.test(msg)) return 'Player'
    if (/yellow/i.test(msg)) return 'Banker'
    if (/azul/i.test(msg)) return 'Player'
    if (/roxo/i.test(msg)) return 'Banker'
    if (/rosa/i.test(msg)) return 'Tie'
    return ''
  }

  if (status === 'signal') {
    message.value = '👉 ENTRADA RECOMENDADA'
    sinal.value = payloadMessage || sinal.value
    tentativas.value = Number.isFinite(greensValue) && greensValue > 0 ? `G${greensValue}` : ''
    greensCount.value = Number.isFinite(greensValue) && greensValue > 0 ? greensValue : 0
    signalTarget.value = extractTarget(payloadMessage)
    assertividade.value = String(data?.assertividade || '')
  } else if (status === 'alert') {
    message.value = '⚠️ FIQUE ATENTO'
    sinal.value = payloadMessage || sinal.value
    tentativas.value = Number.isFinite(greensValue) && greensValue > 0 ? `G${greensValue}` : tentativas.value
    if (Number.isFinite(greensValue) && greensValue > 0) greensCount.value = greensValue
    assertividade.value = String(data?.assertividade || assertividade.value)
  } else if (status === 'win') {
    message.value = '✅ GREEN'
    sinal.value = payloadMessage || '✅ GREEN'
    tentativas.value = ''
    greensCount.value = 0
    signalTarget.value = ''
    // Aguarda o catalogador gravar o resultado antes de buscar
    setTimeout(() => fetchResults(), 2000)
  } else if (status === 'loss') {
    message.value = '❌ LOSS'
    sinal.value = payloadMessage || '❌ LOSS'
    tentativas.value = ''
    greensCount.value = 0
    signalTarget.value = ''
    setTimeout(() => fetchResults(), 2000)
  } else if (status === 'cancelled') {
    message.value = '❌ PADRAO CANCELADO'
    sinal.value = ''
    tentativas.value = ''
    greensCount.value = 0
    signalTarget.value = ''
  } else {
    return
  }

  isLoadingSinal.value = false
}

const handleWsMessage = (rawData: string) => {
  try {
    const parsed = JSON.parse(rawData)
    setSignalFromWsStatus(parsed)
  } catch (error) {
    console.error('Mensagem WSS invalida:', error)
  }
}

const connectSignalWs = () => {
  const cfg = gameSignalConfig.value
  if (!cfg?.signalUrl) return

  // normaliza para o shape esperado internamente
  const url = cfg.signalUrl
  const name = cfg.signalName
  const collection = cfg.signalCollection

  signalWsDestroyed = false
  isLoadingSinal.value = !sinal.value

  if (signalReconnectTimer) {
    clearTimeout(signalReconnectTimer)
    signalReconnectTimer = null
  }

  if (signalWs) {
    signalWs.onclose = null
    signalWs.close()
    signalWs = null
  }

  let wsUrl = url
  if (window.location.protocol === 'https:') {
    wsUrl = wsUrl.replace(/^ws:\/\//i, 'wss://')
  }

  signalWs = new WebSocket(wsUrl)

  signalWs.onopen = () => {
    const payload: Record<string, string> = {
      type: 'subscribe',
      name
    }

    if (collection) {
      payload.collection = collection
    }

    signalWs?.send(JSON.stringify(payload))
  }

  signalWs.onmessage = (event) => {
    handleWsMessage(event.data)
  }

  signalWs.onerror = () => {
    isLoadingSinal.value = false
  }

  signalWs.onclose = () => {
    if (signalWsDestroyed) return

    signalReconnectTimer = setTimeout(() => {
      connectSignalWs()
    }, SIGNAL_RECONNECT_MS)
  }
}

const disconnectSignalWs = () => {
  signalWsDestroyed = true

  if (signalReconnectTimer) {
    clearTimeout(signalReconnectTimer)
    signalReconnectTimer = null
  }

  if (signalWs) {
    signalWs.onclose = null
    signalWs.close()
    signalWs = null
  }
}

// Config do catalogador baseada no jogo atual
const resultsConfigs = computed(() => {
  return getCatalogadorQueries(gameId.value)
})

// Estado dos resultados
const allResults = ref<Array<{ winner: string; Score: string; Hora: string; color: string; date: string; multiplier?: number | string }>>([])
const isLoadingResults = ref(false)
let resultsInterval: ReturnType<typeof setInterval> | null = null
let latestResultsRequestId = 0

// Mobile sidebar
const sidebarOpen = ref(false)

// Filtros
const colorFilter = ref<'all' | 'Player' | 'Banker' | 'Tie'>('all')
const dateFilter = ref<string>('all')
const roundsLimit = ref(50)

// Datas disponíveis
const availableDates = computed(() => {
  const dates = new Set<string>()
  allResults.value.forEach(r => {
    if (r.date) dates.add(r.date)
  })
  return Array.from(dates).sort().reverse()
})

// Formatar data para exibição
const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// Resultados filtrados (para o grid e stats de contagem)
const filteredResults = computed(() => {
  let results = allResults.value
  
  // Filtrar por data
  if (dateFilter.value !== 'all') {
    results = results.filter(r => r.date === dateFilter.value)
  }
  
  // Filtrar por cor
  if (colorFilter.value !== 'all') {
    results = results.filter(r => r.winner === colorFilter.value)
  }
  
  // Limitar quantidade
  return results.slice(0, roundsLimit.value)
})

// Resultados SEM filtro de cor — usados para ausência, repetições e máximas.
// Essas métricas precisam considerar todo o histórico filtrado por data,
// sem depender do limite visual de rodadas exibidas no grid.
const baseResults = computed(() => {
  let results = allResults.value

  if (dateFilter.value !== 'all') {
    results = results.filter(r => r.date === dateFilter.value)
  }

  return results
})

// Estatísticas
const stats = computed(() => {
  const total = filteredResults.value.length
  const player = filteredResults.value.filter(r => r.winner === 'Player').length
  const banker = filteredResults.value.filter(r => r.winner === 'Banker').length
  const tie = filteredResults.value.filter(r => r.winner === 'Tie').length
  
  return {
    player,
    banker,
    tie,
    playerPercent: total > 0 ? ((player / total) * 100).toFixed(1) : '0.0',
    bankerPercent: total > 0 ? ((banker / total) * 100).toFixed(1) : '0.0',
    tiePercent: total > 0 ? ((tie / total) * 100).toFixed(1) : '0.0'
  }
})

// Estatísticas Avançadas (Máximas, Ausências, Repetições)
const advancedStats = computed(() => {
  const results = baseResults.value
  if (results.length === 0) {
    return {
      maxPlayer: 0, maxBanker: 0, maxTie: 0,
      absencePlayer: 0, absenceBanker: 0, absenceTie: 0,
      currentPlayer: 0, currentBanker: 0, currentTie: 0
    }
  }

  // Calcular sequências máximas
  let maxPlayer = 0, maxBanker = 0, maxTie = 0
  let currentPlayerSeq = 0, currentBankerSeq = 0, currentTieSeq = 0

  for (const r of results) {
    if (r.winner === 'Player') {
      currentPlayerSeq++
      maxPlayer = Math.max(maxPlayer, currentPlayerSeq)
      currentBankerSeq = 0
      currentTieSeq = 0
    } else if (r.winner === 'Banker') {
      currentBankerSeq++
      maxBanker = Math.max(maxBanker, currentBankerSeq)
      currentPlayerSeq = 0
      currentTieSeq = 0
    } else if (r.winner === 'Tie') {
      currentTieSeq++
      maxTie = Math.max(maxTie, currentTieSeq)
      currentPlayerSeq = 0
      currentBankerSeq = 0
    }
  }

  // Calcular ausências atuais (quantas rodadas desde a última aparição)
  let absencePlayer = 0, absenceBanker = 0, absenceTie = 0
  let foundPlayer = false, foundBanker = false, foundTie = false

  for (const r of results) {
    if (!foundPlayer && r.winner !== 'Player') absencePlayer++
    else foundPlayer = true
    
    if (!foundBanker && r.winner !== 'Banker') absenceBanker++
    else foundBanker = true
    
    if (!foundTie && r.winner !== 'Tie') absenceTie++
    else foundTie = true

    if (foundPlayer && foundBanker && foundTie) break
  }

  // Sequência atual (do resultado mais recente)
  let currentPlayer = 0, currentBanker = 0, currentTie = 0
  if (results.length > 0) {
    const firstWinner = results[0]!.winner
    for (const r of results) {
      if (r.winner === firstWinner) {
        if (firstWinner === 'Player') currentPlayer++
        else if (firstWinner === 'Banker') currentBanker++
        else if (firstWinner === 'Tie') currentTie++
      } else {
        break
      }
    }
  }

  return {
    maxPlayer, maxBanker, maxTie,
    absencePlayer, absenceBanker, absenceTie,
    currentPlayer, currentBanker, currentTie
  }
})

// Estratégias Personalizadas - Análise de Padrões
// Analisa os padrões que aparecem nos resultados e calcula o que vem depois até G2
const strategies = computed(() => {
  const results = allResults.value
  if (results.length < 50) return []

  // Mapear para array simples - results[0] é o mais RECENTE
  const winners = results.map(r => r.winner)
  
  // Vamos analisar na ordem CRONOLÓGICA (do mais antigo para o mais recente)
  const chronological = [...winners].reverse() // agora [0] é o mais antigo
  
  // Estatísticas: para cada padrão, contar o que aconteceu DEPOIS
  const patternStats: Record<string, {
    pattern: string[]
    // Contagem de vitórias em cada posição
    g0: { player: number, banker: number, tie: number }
    // Contagem de vitórias até G2 (se Player/Banker apareceu em G0, G1 ou G2)
    untilG2: { player: number, banker: number, tie: number }
    total: number
  }> = {}

  // Analisar padrões de tamanho 1, 2 e 3
  for (const patternSize of [1, 2, 3]) {
    for (let i = 0; i <= chronological.length - patternSize - 3; i++) {
      const pattern = chronological.slice(i, i + patternSize)
      const patternKey = pattern.join('-')
      
      const g0 = chronological[i + patternSize]
      const g1 = chronological[i + patternSize + 1]
      const g2 = chronological[i + patternSize + 2]
      
      if (!g0 || !g1 || !g2) continue
      
      if (!patternStats[patternKey]) {
        patternStats[patternKey] = {
          pattern: [...pattern],
          g0: { player: 0, banker: 0, tie: 0 },
          untilG2: { player: 0, banker: 0, tie: 0 },
          total: 0
        }
      }
      
      patternStats[patternKey].total++
      
      // Contar G0 direto
      if (g0 === 'Player') patternStats[patternKey].g0.player++
      else if (g0 === 'Banker') patternStats[patternKey].g0.banker++
      else patternStats[patternKey].g0.tie++
      
      // Contar até G2 (se apareceu em qualquer um dos 3)
      if (g0 === 'Player' || g1 === 'Player' || g2 === 'Player') {
        patternStats[patternKey].untilG2.player++
      }
      if (g0 === 'Banker' || g1 === 'Banker' || g2 === 'Banker') {
        patternStats[patternKey].untilG2.banker++
      }
      if (g0 === 'Tie' || g1 === 'Tie' || g2 === 'Tie') {
        patternStats[patternKey].untilG2.tie++
      }
    }
  }

  // Converter para array de estratégias
  const allStrategies: Array<{
    name: string
    pattern: string[]
    prediction: string
    icon: string
    occurrences: number
    greens: number
    reds: number
    winRateG2: string
  }> = []

  for (const [, stats] of Object.entries(patternStats)) {
    if (stats.total < 3) continue
    
    // Verificar cada cor para G2
    const colorsG2 = [
      { color: 'Player', count: stats.untilG2.player },
      { color: 'Banker', count: stats.untilG2.banker },
      { color: 'Tie', count: stats.untilG2.tie }
    ]
    
    for (const { color, count } of colorsG2) {
      const winRate = (count / stats.total) * 100
      
      // Adicionar TODAS as estratégias (vamos filtrar depois)
      const patternDisplay = stats.pattern.map((p) => getWinnerLetter(p)).join(' → ')
      const predictionLetter = getWinnerLetter(color)
      
      let icon = '📊'
      if (stats.pattern.length === 1) {
        icon = stats.pattern[0] === 'Tie' ? '🎯' : '➡️'
      } else if (stats.pattern.every(p => p === stats.pattern[0])) {
        icon = '🔄'
      } else {
        icon = '↔️'
      }
      
      allStrategies.push({
        name: `${patternDisplay} → ${predictionLetter}`,
        pattern: stats.pattern,
        prediction: color,
        icon,
        occurrences: stats.total,
        greens: count,
        reds: stats.total - count,
        winRateG2: winRate.toFixed(1)
      })
    }
  }

  // Ordenar por taxa de acerto e pegar os TOP 15
  return allStrategies
    .sort((a, b) => {
      const rateDiff = parseFloat(b.winRateG2) - parseFloat(a.winRateG2)
      if (Math.abs(rateDiff) < 0.5) return b.occurrences - a.occurrences
      return rateDiff
    })
    .slice(0, 15) // Top 15 estratégias
})

// Funções auxiliares
const getWinnerClass = (winner: string) => {
  switch (winner) {
    case 'Player': return 'player'
    case 'Banker': return 'banker'
    case 'Tie': return 'tie'
    default: return ''
  }
}

const getWinnerLetter = (winner: string) => {
  switch (winner) {
    case 'Player': return outcomeMeta.value.player.letter
    case 'Banker': return outcomeMeta.value.banker.letter
    case 'Tie': return outcomeMeta.value.tie.letter
    default: return '?'
  }
}

const getWinnerLabel = (winner: string) => {
  switch (winner) {
    case 'Player': return outcomeMeta.value.player.label
    case 'Banker': return outcomeMeta.value.banker.label
    case 'Tie': return outcomeMeta.value.tie.label
    default: return winner
  }
}

const getFilterLabel = (winner: CanonicalWinner) => {
  if (winner === 'Player') return isAviator.value ? outcomeMeta.value.player.label.toLowerCase() : outcomeMeta.value.player.label
  if (winner === 'Banker') return isAviator.value ? outcomeMeta.value.banker.label.toLowerCase() : outcomeMeta.value.banker.label
  return isAviator.value ? outcomeMeta.value.tie.label.toLowerCase() : outcomeMeta.value.tie.label
}

const resultsCountLabel = computed(() => {
  if (isAviator.value) {
    return `${filteredResults.value.length} / ${allResults.value.length}`
  }

  return `${filteredResults.value.length} de ${allResults.value.length}`
})

const shouldUseScoreDisplay = (result: { Score: string; multiplier?: number | string }) => {
  if (isAviator.value) {
    return result.multiplier !== undefined && result.multiplier !== null && String(result.multiplier).trim() !== ''
  }

  return Boolean(result.Score?.trim())
}

const getResultDisplay = (result: { winner: string; Score: string; multiplier?: number | string }) => {
  if (isAviator.value && result.multiplier !== undefined && result.multiplier !== null && String(result.multiplier).trim() !== '') {
    const numericMultiplier = Number(result.multiplier)
    if (Number.isFinite(numericMultiplier)) {
      return numericMultiplier.toFixed(2).replace(/\.00$/, '')
    }

    return String(result.multiplier)
  }

  if (shouldUseScoreDisplay(result)) {
    return result.Score
  }

  return getWinnerLetter(result.winner)
}

const strategyFooterLabel = computed(() => {
  return `${allResults.value.length} ${catalogadorUi.value.resultUnit} • G2 = 3 entradas`
})

// Tipos do catalogador
interface CatalogadorResult {
  winner: string
  Score: string
  Hora: string
  color: string
  multiplier?: number | string
}
interface CatalogadorDay {
  _id: string
  date: string
  game: string
  results: CatalogadorResult[]
}
interface CatalogadorResponse {
  success: boolean
  collection: string
  filters: { game: string | null; date: string | null }
  pagination: { page: number; limit: number; totalDocs: number; totalPages: number; hasMore: boolean }
  count: number
  data: CatalogadorDay[]
}

// Buscar resultados do catalogador
const fetchResults = async () => {
  isLoadingResults.value = true
  const configs = resultsConfigs.value
  const requestId = ++latestResultsRequestId

  if (!configs.length) {
    allResults.value = []
    isLoadingResults.value = false
    return
  }

  try {
    const requestNonce = Date.now()
    let response: CatalogadorResponse | null = null

    for (const cfg of configs) {
      const candidate = await $fetch<CatalogadorResponse>(
        CATALOGADOR_ENDPOINT,
        {
          cache: 'no-store',
          params: {
            collection: cfg.collection,
            game: cfg.game,
            limit: 2000,
            _t: requestNonce
          }
        }
      )

      if (candidate?.success && candidate.data?.length > 0) {
        response = candidate
        break
      }
    }

    // Ignora respostas antigas que chegaram depois de uma requisição mais nova.
    if (requestId !== latestResultsRequestId) {
      return
    }

    if (response?.success && response.data?.length > 0) {
      const allDaysResults: Array<{ winner: string; Score: string; Hora: string; color: string; date: string; multiplier?: number | string }> = []

      for (const day of response.data) {
        for (const result of day.results) {
          const normalizedWinner = normalizeWinner(result.winner, result.color, result.multiplier ?? result.Score, gameId.value)
          if (!normalizedWinner) continue

          allDaysResults.push({
            winner: normalizedWinner,
            Score: result.Score,
            Hora: result.Hora,
            color: result.color,
            date: day.date,
            multiplier: result.multiplier
          })
        }
      }

      allResults.value = allDaysResults
    } else {
      allResults.value = []
      console.warn('[Resultados] API retornou success=false ou data vazio para todas as configuracoes do jogo:', configs)
    }
  } catch (error) {
    if (requestId !== latestResultsRequestId) {
      return
    }
    console.error('[Resultados] Erro ao buscar resultados do catalogador:', error)
  } finally {
    if (requestId === latestResultsRequestId) {
      isLoadingResults.value = false
    }
  }
}

// Configurações dos jogos
const gamesConfig = ref<Record<string, any>>({
  'bac-bo': {
    id: 'bac-bo',
    name: 'Bac Bo',
    provider: 'Evolution',
    iframeUrl: '',
    suggestion: {
      pattern: '2/1/2 VERDE',
      sequence: ['green', 'green', 'blue', 'blue', 'green'],
      result: '🎯'
    },
    strategies: [
      { name: '2/1/2 VERDE', sequence: ['green', 'green', 'blue', 'blue', 'green'], result: '🎯', winRate: '91.11%', stats: 'SG:23 G1:13 G2' },
      { name: '2/1/2 AZUL', sequence: ['blue', 'blue', 'green', 'green', 'blue'], result: '🎯', winRate: '93.94%', stats: 'SG:20 G1:9 G2:2' },
      { name: 'ESCADINHA VERDE', sequence: ['green', 'green', 'blue', 'blue', 'green'], result: '🎯', winRate: '93.33%', stats: 'SG' },
      { name: 'ESCADINHA AZUL', sequence: ['blue', 'blue', 'green', 'green', 'blue'], result: '🎯', winRate: '100.00%', stats: 'SG:' },
      { name: 'RETORNO DO SURF VERDE', sequence: ['green', 'green', 'green', 'blue', 'blue', 'green'], result: '', winRate: '', stats: '' },
      { name: '3 - 3 = QUEBRA VERDE', sequence: ['green', 'green', 'green', 'blue', 'blue', 'green'], result: '🎯', winRate: '100', stats: '' }
    ],
    payouts: [
      { bet: 'CASA (A) *', pays: '1:1' },
      { bet: 'VISITANTE (B) *', pays: '1:1' },
      { bet: 'EMPATE (X)', pays: '11:1' }
    ],
    note: 'Em caso de EMPATE (X), metade de sua aposta principal será devolvida.',
    rtp: [
      { name: 'Aposta principal (CASA (A)/VISITANTE (B))', value: '96,27%' },
      { name: 'EMPATE (X)', value: '89,64%' }
    ],
    betInfo: 'O painel de LIMITES DE APOSTAS exibe os limites de aposta mínimo e máximo permitidos na mesa, os quais podem variar de vez em quando. Abra este painel para conferir seus limites atuais.'
  },
  'bac-bo-en': {
    id: 'bac-bo-en',
    name: 'Bac Bo EN',
    provider: 'Evolution',
    iframeUrl: '',
    suggestion: {
      pattern: '2/1/2 VERDE',
      sequence: ['green', 'green', 'blue', 'blue', 'green'],
      result: '🎯'
    },
    strategies: [
      { name: '2/1/2 VERDE', sequence: ['green', 'green', 'blue', 'blue', 'green'], result: '🎯', winRate: '91.11%', stats: 'SG:23 G1:13 G2' },
      { name: '2/1/2 AZUL', sequence: ['blue', 'blue', 'green', 'green', 'blue'], result: '🎯', winRate: '93.94%', stats: 'SG:20 G1:9 G2:2' },
      { name: 'ESCADINHA VERDE', sequence: ['green', 'green', 'blue', 'blue', 'green'], result: '🎯', winRate: '93.33%', stats: 'SG' },
      { name: 'ESCADINHA AZUL', sequence: ['blue', 'blue', 'green', 'green', 'blue'], result: '🎯', winRate: '100.00%', stats: 'SG:' },
      { name: 'RETORNO DO SURF VERDE', sequence: ['green', 'green', 'green', 'blue', 'blue', 'green'], result: '', winRate: '', stats: '' },
      { name: '3 - 3 = QUEBRA VERDE', sequence: ['green', 'green', 'green', 'blue', 'blue', 'green'], result: '🎯', winRate: '100', stats: '' }
    ],
    payouts: [
      { bet: 'CASA (A) *', pays: '1:1' },
      { bet: 'VISITANTE (B) *', pays: '1:1' },
      { bet: 'EMPATE (X)', pays: '11:1' }
    ],
    note: 'Em caso de EMPATE (X), metade de sua aposta principal será devolvida.',
    rtp: [
      { name: 'Aposta principal (CASA (A)/VISITANTE (B))', value: '96,27%' },
      { name: 'EMPATE (X)', value: '89,64%' }
    ],
    betInfo: 'O painel de LIMITES DE APOSTAS exibe os limites de aposta mínimo e máximo permitidos na mesa, os quais podem variar de vez em quando. Abra este painel para conferir seus limites atuais.'
  }
})

// Computed
const currentGame = computed(() => {
  const baseGame = gamesConfig.value[resolvedGameId.value] || gamesConfig.value['bac-bo']

  return {
    ...baseGame,
    id: gameId.value,
    name: routeGameConfig.value.displayName || baseGame.name,
    provider: routeGameConfig.value.provider || baseGame.provider
  }
})

// Função para carregar o jogo
const loadGame = async () => {
  if (!isAuthenticated.value) {
    return
  }

  // 1. Busca config de sinais da API (signalUrl, signalName, signalCollection)
  await fetchGameConfig(gameId.value)

  // 2. Conecta ao WSS agora que gameSignalConfig está populado
  connectSignalWs()

  // 3. Inicia o jogo
  const url = await startGame(gameId.value)
  if (url) {
    iframeUrl.value = url
  }
}

// Carrega o jogo ao montar o componente
onMounted(() => {
  loadGame()
  fetchResults()
})

onUnmounted(() => {
  if (resultsInterval) {
    clearInterval(resultsInterval)
    resultsInterval = null
  }

  disconnectSignalWs()
})

// Recarrega se a autenticação mudar (ex: login na mesma aba)
watch(isAuthenticated, (newVal) => {
  if (newVal && !iframeUrl.value) {
    loadGame()
  }
})

useHead({
  title: () => `${currentGame.value.name} - Rainha da Bet`
})
</script>

<style scoped>
.jogo-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 0% 0%, rgba(0, 111, 255, 0.15) 0%, transparent 35%),
    radial-gradient(circle at 100% 0%, rgba(240, 24, 40, 0.15) 0%, transparent 38%),
    #05070d;
  color: white;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(180deg, rgba(5, 7, 13, 0.98) 0%, rgba(5, 7, 13, 0.92) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 163, 255, 0.15);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.game-indicator {
  width: 40px;
  height: 40px;
  background: #1a1a1a;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  color: #10b981;
  font-size: 12px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.game-title {
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #ef4444;
  border-color: #ef4444;
}

/* Main Content */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Sidebar Flutuante */
.sidebar {
  position: absolute;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: 400px;
  max-width: calc(100% - 32px);
  background: rgba(15, 15, 15, 0.98);
  border: 1px solid #333;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 90;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

/* Botão abrir painel - escondido no desktop */
.open-panel-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--accent-color);
  color: #000;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

/* Botão fechar sidebar mobile */
.close-sidebar-btn {
  display: none;
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  z-index: 10;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.close-sidebar-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Overlay para fechar sidebar */
.sidebar-overlay {
  display: none;
}

.panel {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-color) 20%, transparent) transparent;
}

.panel::-webkit-scrollbar {
  width: 6px;
}

.panel::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.panel::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-color) 20%, transparent);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.panel::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

.panel-header h2 {
  flex: 1;
  margin: 0;
  font-size: 16px;
}

.panel-header :deep(svg) {
  font-size: 18px;
  color: #888;
}

/* Possível Entrada styles */
.possivel-entrada-section {
  background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 15px;
}

.possivel-entrada-header {
  padding: 4px 1rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(251, 101, 166, 0.3);
}

.entrada-message {
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  text-align: center;
  letter-spacing: 0.5px;
  margin-bottom: 0.4rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.possivel-entrada-content {
  display: flex;
  padding: 0.8rem;
  gap: 0.8rem;
  justify-content: center;
  will-change: contents;
  contain: content;
  background-color: #1a1a1a;
}

.entrada-indicator {
  background: linear-gradient(135deg, #2d2d2d 0%, #1f1f1f 100%);
  border-radius: 10px;
  width: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80px;
  position: relative;
  overflow: hidden;
  border: 1px solid #444;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.data-label {
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 0.2rem;
  font-weight: normal;
}

.tentativas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.tentativas-balls {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 4px;
}

.tentativa-pill {
  padding: 6px 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.tentativa-pill.player {
  background: var(--player-color-soft);
  border: 1px solid var(--player-color-strong);
  color: var(--player-text-color);
}

.tentativa-pill.banker {
  background: var(--banker-color-soft);
  border: 1px solid var(--banker-color-strong);
  color: var(--banker-text-color);
}

.tentativa-pill.tie {
  background: var(--tie-color-soft);
  border: 1px solid var(--tie-color-strong);
  color: var(--tie-text-color);
}

.tentativa-pill.default {
  background: rgba(68, 68, 68, 0.3);
  border: 1px solid #555;
  color: #aaa;
}

.sinal-value, .tentativas-value {
  font-size: 0.9rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.3rem;
  letter-spacing: 1px;
}

.sinal-value.aguardando {
  font-size: 1rem;
  color: #666 !important;
  letter-spacing: 0.5px;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.loading-spinner svg {
  font-size: 24px;
}

/* Spinner animation */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transições suaves */
.sinal-value, .tentativas-value, .possivel-entrada-header h3 {
  transition: opacity 0.3s ease;
}

.possivel-entrada-section * {
  transition: color 0.3s ease, background-color 0.3s ease;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Altura consistente para evitar saltos */
.sinal-value, .tentativas-value, .loading-spinner {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tentativas-container {
  min-height: 30px;
  width: 100%;
  text-align: center;
}

/* Filters Section */
.filters-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.filter-group {
  margin-bottom: 16px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  background: #222;
  color: #fff;
}

.filter-btn.active {
  background: #333;
  border-color: var(--accent-color);
  color: #fff;
}

.filter-btn.active.player {
  border-color: var(--player-color);
}

.filter-btn.active.banker {
  border-color: var(--banker-color);
}

.filter-btn.active.tie {
  border-color: var(--tie-color);
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.color-dot.player {
  background: var(--player-color);
}

.color-dot.banker {
  background: var(--banker-color);
}

.color-dot.tie {
  background: var(--tie-color);
}

.filter-select {
  width: 100%;
  padding: 10px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-row .filter-group {
  flex: 1;
  margin-bottom: 0;
}

/* Results Section */
.results-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: #888;
}

.results-count {
  font-size: 12px;
  color: #666;
}

.results-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--accent-color);
  font-size: 14px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}

.result-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  cursor: default;
}

.result-item.player {
  background: var(--player-color);
  color: var(--player-text-color);
}

.result-item.banker {
  background: var(--banker-color);
  color: var(--banker-text-color);
}

.result-item.tie {
  background: var(--tie-color);
  color: var(--tie-text-color);
}

.result-letter {
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* Results Stats */
.results-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding-top: 12px;
  border-top: 1px solid #222;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  white-space: nowrap;
}

.stat-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.stat-item.player .stat-color {
  background: var(--player-color);
}

.stat-item.banker .stat-color {
  background: var(--banker-color);
}

.stat-item.tie .stat-color {
  background: var(--tie-color);
}

.stat-label {
  color: #888;
}

.stat-value {
  color: #fff;
  font-weight: 600;
}

.stat-percent {
  color: #666;
  font-size: 10px;
}

/* Advanced Stats Section */
.advanced-stats-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.advanced-stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}

.advanced-stats-header :deep(svg) {
  font-size: 16px;
  color: var(--accent-color);
}

.advanced-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stats-card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 10px;
  overflow: hidden;
}

.stats-card-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 8px;
}

.stats-card-title :deep(svg) {
  font-size: 12px;
  color: #666;
}

.stats-card-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.stats-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  flex-shrink: 0;
}

.stats-row.player .stats-dot {
  background: var(--player-color);
}

.stats-row.banker .stats-dot {
  background: var(--banker-color);
}

.stats-row.tie .stats-dot {
  background: var(--tie-color);
}

.stats-name {
  color: #888;
  flex: 1;
  font-size: 10px;
}

.stats-number {
  font-weight: 700;
  color: #fff;
  font-size: 12px;
  min-width: 18px;
  text-align: right;
}

.aviator-theme .filters-section,
.aviator-theme .results-section,
.aviator-theme .advanced-stats-section {
  background: #101818;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.aviator-theme .filter-group label {
  font-size: 13px;
  color: #8f8f9a;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.aviator-theme .aviator-filter-buttons {
  gap: 10px;
}

.aviator-theme .filter-btn {
  min-height: 54px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #1b2424;
  color: #b7bcc5;
  font-size: 15px;
  font-weight: 700;
  text-transform: lowercase;
}

.aviator-theme .filter-btn.all {
  text-transform: none;
}

.aviator-theme .filter-btn.active {
  background: #37a7ff;
  border-color: #37a7ff;
  color: #081015;
  box-shadow: 0 10px 28px rgba(55, 167, 255, 0.22);
}

.aviator-theme .filter-btn.active.player,
.aviator-theme .filter-btn.active.banker,
.aviator-theme .filter-btn.active.tie {
  border-color: transparent;
}

.aviator-theme .filter-select {
  min-height: 62px;
  padding: 0 20px;
  background: #111919;
  border: 1px solid rgba(112, 133, 138, 0.35);
  border-radius: 18px;
  color: #ffffff;
  font-size: 16px;
}

.aviator-theme .aviator-filter-row {
  align-items: flex-end;
  margin-bottom: 0;
}

.aviator-theme .filter-group-date {
  flex: 1.5;
}

.aviator-theme .filter-group-rounds {
  flex: 0.9;
}

.aviator-theme .results-header {
  margin-bottom: 18px;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.aviator-theme .results-count {
  font-size: 18px;
  color: #9ca3af;
}

.aviator-theme .aviator-results-grid {
  grid-template-columns: repeat(auto-fit, minmax(54px, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.aviator-theme .aviator-result-item {
  aspect-ratio: 1.08;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.aviator-theme .aviator-result-item.player {
  background: rgba(36, 82, 154, 0.34);
  color: #4f8fff;
}

.aviator-theme .aviator-result-item.banker {
  background: rgba(105, 53, 162, 0.34);
  color: #b15cff;
}

.aviator-theme .aviator-result-item.tie {
  background: rgba(149, 44, 101, 0.34);
  color: #ff5cae;
}

.aviator-theme .result-score {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
  text-shadow: none;
}

.aviator-theme .results-stats {
  gap: 20px;
  padding-top: 0;
  border-top: 0;
}

.aviator-theme .stat-item {
  gap: 8px;
  font-size: 16px;
}

.aviator-theme .stat-color {
  width: 16px;
  height: 16px;
  border-radius: 999px;
}

.aviator-theme .stat-label {
  color: #ffffff;
  text-transform: lowercase;
}

.aviator-theme .stat-value {
  font-size: 17px;
}

.aviator-theme .stat-percent {
  font-size: 14px;
  color: #8f96a3;
}

.aviator-theme .advanced-stats-header {
  font-size: 18px;
  margin-bottom: 20px;
}

.aviator-theme .advanced-stats-grid {
  gap: 16px;
}

.aviator-theme .stats-card {
  background: #152020;
  border: 1px solid rgba(101, 117, 124, 0.28);
  border-radius: 22px;
  padding: 18px 16px;
}

.aviator-theme .stats-card-title {
  gap: 8px;
  margin-bottom: 14px;
  color: #a1a1aa;
  font-size: 13px;
  text-transform: none;
  letter-spacing: 0;
}

.aviator-theme .stats-card-title :deep(svg) {
  font-size: 18px;
  color: #a1a1aa;
}

.aviator-theme .stats-card-items {
  gap: 10px;
}

.aviator-theme .stats-row {
  gap: 10px;
  font-size: 16px;
}

.aviator-theme .stats-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.aviator-theme .stats-name {
  color: #f4f4f5;
  font-size: 16px;
  text-transform: lowercase;
}

.aviator-theme .stats-number {
  font-size: 18px;
}

/* Strategy Section */
.strategy-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.strategy-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}

.strategy-header :deep(svg) {
  font-size: 16px;
  color: var(--accent-color);
}

.strategy-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #10b981;
}

.strategy-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #666;
  font-size: 12px;
  text-align: center;
}

.strategy-empty.no-strategies {
  flex-direction: column;
  color: #888;
}

.strategy-empty.no-strategies :deep(svg) {
  font-size: 24px;
  color: #f97316;
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.strategy-item {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-pattern {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-icon {
  font-size: 14px;
}

.strategy-name {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.strategy-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.strategy-prediction {
  display: flex;
  align-items: center;
  gap: 6px;
}

.prediction-label {
  font-size: 10px;
  color: #666;
}

.prediction-badge {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.prediction-badge.player {
  background: var(--player-color);
  color: var(--player-text-color);
}

.prediction-badge.banker {
  background: var(--banker-color);
  color: var(--banker-text-color);
}

.prediction-badge.tie {
  background: var(--tie-color);
  color: var(--tie-text-color);
}

.strategy-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.stats-badge.g2 {
  background: rgba(100, 100, 100, 0.2);
  color: #888;
}

.stats-badge.g2.very-high {
  background: rgba(0, 163, 255, 0.15);
  color: #00a3ff;
  border: 1px solid rgba(0, 163, 255, 0.3);
}

.stats-badge.g2.high {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.stats-badge.g2.medium {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.stats-green {
  font-size: 10px;
  color: #10b981;
}

.stats-red {
  font-size: 10px;
  color: #ef4444;
}

.strategy-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #222;
  font-size: 10px;
  color: #555;
}

.strategy-footer :deep(svg) {
  font-size: 12px;
}

/* Game Area - Flutuante */
.game-area {
  position: absolute;
  top: 16px;
  left: 432px;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  background: rgba(15, 15, 15, 0.98);
  border: 1px solid #333;
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.iframe-container {
  flex: 1;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  margin: 12px;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

.iframe-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  color: #666;
  gap: 16px;
  border-radius: 8px;
}

.iframe-placeholder :deep(svg) {
  font-size: 64px;
  color: #333;
}

.iframe-placeholder h3 {
  font-size: 20px;
  color: #888;
}

.iframe-placeholder p {
  font-size: 14px;
}

.iframe-placeholder.loading :deep(svg) {
  color: #00a3ff;
}

.iframe-placeholder.loading h3 {
  color: #00a3ff;
}

.iframe-placeholder.error :deep(svg) {
  color: #ef4444;
}

.iframe-placeholder.error h3 {
  color: #ef4444;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.btn-retry,
.btn-login {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-retry {
  background: transparent;
  border: 1px solid #00a3ff;
  color: #00a3ff;
}

.btn-retry:hover {
  background: #00a3ff;
  color: black;
}

.btn-login {
  background: #00a3ff;
  border: none;
  color: black;
}

.btn-login:hover {
  background: #00b8e6;
}

/* Responsive */
@media (max-width: 900px) {
  .sidebar {
    width: calc(100% - 32px);
    max-width: none;
  }

  .aviator-theme .aviator-results-grid {
    grid-template-columns: repeat(auto-fit, minmax(52px, 1fr));
  }

  .aviator-theme .advanced-stats-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar.visible ~ .game-area {
    left: 16px;
  }
  
  .open-panel-btn {
    top: 12px;
    left: 12px;
    width: 44px;
    height: 44px;
  }
  
  .game-area {
    top: 12px;
    left: 12px;
    right: 12px;
    bottom: 12px;
  }
}

@media (max-width: 640px) {
  .header {
    padding: 12px 16px;
  }
  
  .game-title {
    font-size: 14px;
  }
  
  .btn-close {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .btn-close span {
    display: none;
  }
  
  /* Mobile: Layout vertical */
  .main-content {
    flex-direction: column;
    overflow-y: auto;
    padding: 0;
  }
  
  /* Mobile: Game area no topo (ordem 1) */
  .game-area {
    position: relative;
    top: 0;
    left: 0;
    right: 0;
    bottom: auto;
    height: 70vh;
    min-height: 70vh;
    border-radius: 0;
    border: none;
    border-bottom: 1px solid #333;
    order: 1;
    flex-shrink: 0;
  }
  
  /* Mobile: Sidebar embaixo (ordem 2) sempre visível */
  .sidebar {
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    border-radius: 0;
    border: none;
    flex: 1;
    min-height: 30vh;
    overflow-y: auto;
    order: 2;
  }
  
  .iframe-container {
    margin: 0;
    border-radius: 0;
  }
  
  .game-iframe {
    border-radius: 0;
  }
  
  /* Esconder botões de abrir/fechar no mobile vertical */
  .open-panel-btn,
  .close-sidebar-btn,
  .sidebar-overlay {
    display: none !important;
  }
  
  .panel {
    padding: 12px;
    overflow-y: visible;
  }
  
  .strategy-item {
    font-size: 11px;
    padding: 10px;
  }
  
  .strategy-name {
    min-width: 100px;
    font-size: 11px;
  }
  
  .color-box {
    width: 18px;
    height: 18px;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 12px;
  }

  .aviator-theme .aviator-filter-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(120px, 0.7fr);
    gap: 12px;
  }

  .aviator-theme .aviator-results-grid {
    grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
    gap: 8px;
  }

  .aviator-theme .result-score {
    font-size: 14px;
  }

  .aviator-theme .results-stats {
    gap: 12px;
  }

  .aviator-theme .stat-item {
    flex-wrap: wrap;
    font-size: 14px;
  }

  .aviator-theme .stats-card {
    border-radius: 18px;
    padding: 16px 14px;
  }

  .aviator-theme .stats-name {
    font-size: 14px;
  }
  
  /* Possível Entrada - Responsivo */
  .possivel-entrada-section {
    margin-bottom: 10px;
  }
  .possivel-entrada-header {
    padding: 0.6rem 0.8rem;
  }
  .possivel-entrada-header h3 {
    font-size: 0.9rem;
  }
  .possivel-entrada-content {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  .entrada-indicator {
    padding: 0.6rem;
    min-height: 60px;
  }
  .data-label {
    font-size: 0.7rem;
  }
  .sinal-value, .tentativas-value {
    font-size: 1.1rem;
    margin-bottom: 0.2rem;
  }
  .loading-spinner svg {
    font-size: 18px;
  }
  
  /* Ajustar estatísticas para mobile */
  .stats-section {
    margin-top: 12px;
  }
  
  .strategy-section {
    margin-top: 16px;
  }
}
</style>
