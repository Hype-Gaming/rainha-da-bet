export interface TournamentPrize { place: number; label: string }
export interface TournamentRanking { position: number; name: string; score: number }
export interface Tournament {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string
  status: 'draft' | 'active' | 'finished'
  prizes: TournamentPrize[]
  rules: string[]
  ranking: TournamentRanking[]
}

export const MOCK_TOURNAMENT: Tournament = {
  id: 'preview',
  title: 'Liga das Rainhas',
  description: 'Acumule pontos durante a campanha e conquiste seu lugar no pódio.',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  status: 'active',
  prizes: [
    { place: 1, label: 'R$ 1.000 + troféu exclusivo' },
    { place: 2, label: 'R$ 500' },
    { place: 3, label: 'R$ 250' }
  ],
  rules: ['Participe usando sua conta cadastrada.', 'A classificação considera os pontos válidos da campanha.', 'Empates seguem a ordem de conquista da pontuação.'],
  ranking: [
    { position: 1, name: 'Marina S.', score: 9840 },
    { position: 2, name: 'Ana C.', score: 8920 },
    { position: 3, name: 'Bianca R.', score: 8310 },
    { position: 4, name: 'Carla M.', score: 7690 },
    { position: 5, name: 'Luiza P.', score: 7150 }
  ]
}
