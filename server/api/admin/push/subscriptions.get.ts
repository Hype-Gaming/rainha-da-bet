import { getDb } from '../../../utils/mongodb'
import { requireAdmin } from '../../../utils/admin'

// Lista os dispositivos inscritos (sem expor as chaves de criptografia),
// enriquecidos com os dados do usuário (nome/telefone) via app_users.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const db = await getDb()
  const docs = await db
    .collection('push_subscriptions')
    .aggregate([
      { $sort: { updated_at: -1 } },
      { $limit: 200 },
      {
        $lookup: {
          from: 'app_users',
          localField: 'email',
          foreignField: 'email',
          as: '_user'
        }
      },
      { $addFields: { user: { $arrayElemAt: ['$_user', 0] } } }
    ])
    .toArray()

  return docs.map((d) => {
    let provider = 'desconhecido'
    try {
      provider = new URL(d.endpoint as string).hostname
    } catch {
      // ignora endpoints malformados
    }
    return {
      id: d._id.toString(),
      email: d.email || null,
      name: d.user?.name || null,
      phone: d.user?.phone || null,
      provider,
      createdAt: d.created_at || null,
      updatedAt: d.updated_at || null,
      lastSeenAt: d.user?.last_seen_at || null
    }
  })
})
