import type { IndexSpecification, CreateIndexesOptions } from 'mongodb'
import { getDb } from '../utils/mongodb'

// Cria os índices do Mongo no boot do servidor.
//
// Por que isto precisa existir: não havia UM índice no projeto. Toda consulta do
// painel (`/api/admin/users`, `/api/admin/stats`) varre a coleção inteira e faz
// $lookup sem apoio de índice. Com 200 usuários é instantâneo; com 20 mil o painel
// para de abrir — e o sintoma aparece de uma vez, sem aviso.
//
// createIndex é idempotente: rodar a cada boot não custa nada se o índice já existe.

interface IndexDef {
  collection: string
  spec: IndexSpecification
  options?: CreateIndexesOptions
}

const INDEXES: IndexDef[] = [
  // Chave de busca de praticamente todo endpoint.
  { collection: 'app_users', spec: { email: 1 }, options: { unique: true, name: 'email_unique' } },
  // Ordenação padrão da tabela de usuários e do filtro "ativos em 48h".
  { collection: 'app_users', spec: { last_seen_at: -1 }, options: { name: 'last_seen_at_desc' } },
  // Métricas "novos hoje" e "novos em 7 dias".
  { collection: 'app_users', spec: { first_seen_at: -1 }, options: { name: 'first_seen_at_desc' } },
  // Vínculo com o e-mail da compra (sparse: a maioria dos documentos não tem).
  { collection: 'app_users', spec: { subscription_email: 1 }, options: { sparse: true, name: 'subscription_email' } },

  { collection: 'subscriptions', spec: { email: 1 }, options: { unique: true, name: 'email_unique' } },
  { collection: 'subscriptions', spec: { status: 1 }, options: { name: 'status' } },

  { collection: 'deposits', spec: { email: 1 }, options: { name: 'email' } },

  { collection: 'access_requests', spec: { email: 1, status: 1 }, options: { name: 'email_status' } },
  { collection: 'access_requests', spec: { created_at: -1 }, options: { name: 'created_at_desc' } },

  { collection: 'settings', spec: { key: 1 }, options: { unique: true, name: 'key_unique' } }
]

export default defineNitroPlugin(() => {
  // Deliberadamente sem await: se o Mongo estiver lento ou fora, o servidor sobe
  // do mesmo jeito e os índices são tentados novamente no próximo restart.
  void (async () => {
    let db
    try {
      db = await getDb()
    } catch (err) {
      console.warn('[indexes] Mongo indisponível no boot; índices não criados.', err)
      return
    }

    for (const { collection, spec, options } of INDEXES) {
      try {
        await db.collection(collection).createIndex(spec, options)
      } catch (err: any) {
        // Um índice único falha se a coleção já tiver duplicatas. Isso é um dado
        // a ser limpo, não motivo para derrubar a aplicação — então avisamos alto
        // e seguimos criando os demais.
        console.warn(
          `[indexes] falha ao criar índice ${options?.name || JSON.stringify(spec)} ` +
          `em "${collection}": ${err?.message || err}`
        )
      }
    }
  })()
})
