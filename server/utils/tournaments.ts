import type { Tournament, TournamentPrize, TournamentRanking } from '../../shared/tournaments'

const str = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export const parseTournamentInput = (body: any): Omit<Tournament, 'id'> => {
  const title = str(body?.title, 100)
  const description = str(body?.description, 600)
  const startsAt = new Date(body?.startsAt)
  const endsAt = new Date(body?.endsAt)
  const status = ['draft', 'active', 'finished'].includes(body?.status) ? body.status : 'draft'
  if (!title || !description || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw createError({ statusCode: 400, message: 'Preencha título, descrição e um período válido.' })
  }
  const prizes: TournamentPrize[] = Array.isArray(body?.prizes) ? body.prizes.slice(0, 20).map((item: any, i: number) => ({
    place: Number(item?.place) || i + 1,
    label: str(item?.label, 120)
  })).filter((item: TournamentPrize) => item.label) : []
  const rules = Array.isArray(body?.rules) ? body.rules.slice(0, 30).map((item: any) => str(item, 300)).filter(Boolean) : []
  const ranking: TournamentRanking[] = Array.isArray(body?.ranking) ? body.ranking.slice(0, 100).map((item: any, i: number) => ({
    position: i + 1,
    name: str(item?.name, 80) || 'Participante',
    score: Math.max(0, Number(item?.score) || 0)
  })).sort((a: TournamentRanking, b: TournamentRanking) => b.score - a.score).map((item: TournamentRanking, i: number) => ({ ...item, position: i + 1 })) : []
  return { title, description, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status, prizes, rules, ranking }
}

export const serializeTournament = (doc: any): Tournament => ({
  id: String(doc._id || doc.id), title: doc.title, description: doc.description,
  startsAt: new Date(doc.starts_at || doc.startsAt).toISOString(),
  endsAt: new Date(doc.ends_at || doc.endsAt).toISOString(), status: doc.status,
  prizes: doc.prizes || [], rules: doc.rules || [], ranking: doc.ranking || []
})
