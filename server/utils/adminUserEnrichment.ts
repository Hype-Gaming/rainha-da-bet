import type { Document } from 'mongodb'

export const HOUR_MS = 60 * 60 * 1000

/**
 * Injeta assinantes ativos (subscriptions.status='active') que NÃO têm registro em
 * app_users como "usuários" sintéticos (pagaram mas nunca abriram o app).
 */
export const buildSubsOnlyUnion = (rx: RegExp | null = null): Document[] => [
  {
    $unionWith: {
      coll: 'subscriptions',
      pipeline: [
        { $match: { status: 'active' } },
        { $group: { _id: '$email', phone: { $first: '$phone' }, name: { $first: '$name' } } },
        { $match: { _id: { $ne: null } } },
        { $lookup: { from: 'app_users', localField: '_id', foreignField: 'email', as: '_au' } },
        { $match: { _au: { $size: 0 } } },
        {
          $project: {
            _id: 0,
            email: '$_id',
            name: { $ifNull: ['$name', null] },
            phone: { $ifNull: ['$phone', null] },
            brand_slug: { $literal: null },
            blocked: { $literal: false },
            first_seen_at: { $literal: null },
            last_seen_at: { $literal: null },
            source: { $literal: 'subscription' }
          }
        },
        ...(rx ? [{ $match: { email: rx } }] : [])
      ]
    }
  }
]

/**
 * Enriquece cada usuário com: assinatura, PIX (qtd/soma), status de contato,
 * override de tag, tag automática de risco e tag efetiva (override manda).
 */
export const buildUserEnrichmentStages = (now = new Date()): Document[] => {
  const cutoff24 = new Date(now.getTime() - 24 * HOUR_MS)
  const cutoff48 = new Date(now.getTime() - 48 * HOUR_MS)
  return [
    { $lookup: { from: 'subscriptions', localField: 'email', foreignField: 'email', as: 'sub' } },
    { $lookup: { from: 'deposits', localField: 'email', foreignField: 'email', as: 'deps' } },
    { $lookup: { from: 'user_contact_status', localField: 'email', foreignField: 'email', as: 'cstatus' } },
    {
      $addFields: {
        subscription: { $cond: [{ $eq: [{ $arrayElemAt: ['$sub.status', 0] }, 'active'] }, 'paid', 'free'] },
        sub_created_at: { $arrayElemAt: ['$sub.created_at', 0] },
        deposits_count: { $size: '$deps' },
        deposits_sum: { $sum: '$deps.amount' },
        contact_status: { $ifNull: [{ $arrayElemAt: ['$cstatus.status', 0] }, 'pendente'] },
        tag_override: { $ifNull: [{ $arrayElemAt: ['$cstatus.tag', 0] }, 'auto'] }
      }
    },
    {
      $addFields: {
        // pago + abriu o app + nunca depositou (relógio = 1º acesso)
        risk_eligible: {
          $and: [
            { $eq: ['$subscription', 'paid'] },
            { $gt: ['$first_seen_at', null] },
            { $eq: ['$deposits_count', 0] }
          ]
        },
        // pago + nunca abriu o app + nunca depositou (relógio = data do pagamento)
        no_access_eligible: {
          $and: [
            { $eq: ['$subscription', 'paid'] },
            { $gt: ['$sub_created_at', null] },
            { $not: [{ $gt: ['$first_seen_at', null] }] },
            { $eq: ['$deposits_count', 0] }
          ]
        },
        // relógio do risco = 1º acesso; se acessou ANTES de pagar, usa a data do pagamento
        risk_clock: { $max: ['$first_seen_at', '$sub_created_at'] }
      }
    },
    {
      $addFields: {
        auto_risk_tag: {
          $switch: {
            branches: [
              { case: { $and: ['$risk_eligible', { $lte: ['$risk_clock', cutoff48] }] }, then: 'risk_48h' },
              { case: { $and: ['$risk_eligible', { $lte: ['$risk_clock', cutoff24] }] }, then: 'risk_24h' },
              { case: { $and: ['$no_access_eligible', { $lte: ['$sub_created_at', cutoff24] }] }, then: 'risk_no_access' }
            ],
            default: null
          }
        }
      }
    },
    {
      $addFields: {
        // override manda: 'auto' usa o cálculo, 'none' zera, outro = a própria tag
        risk_tag: {
          $switch: {
            branches: [
              { case: { $eq: ['$tag_override', 'none'] }, then: null },
              { case: { $eq: ['$tag_override', 'auto'] }, then: '$auto_risk_tag' }
            ],
            default: '$tag_override'
          }
        }
      }
    },
    { $project: { sub: 0, deps: 0, cstatus: 0, risk_eligible: 0, no_access_eligible: 0, risk_clock: 0 } }
  ]
}
