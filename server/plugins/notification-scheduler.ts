import { getDb } from '../utils/mongodb'
import { isPushConfigured, DEFAULT_PUSH_ICON } from '../utils/webpush'
import { dispatchToAllSubscriptions } from '../utils/pushDispatch'

// Intervalo entre ticks do agendador e atraso do primeiro tick após o boot
// (curto o suficiente para pegar jobs que venceram enquanto o servidor
// estava fora do ar, sem competir com o resto da inicialização).
const TICK_INTERVAL_MS = 60_000
const FIRST_TICK_DELAY_MS = 5_000

// Tempo máximo que um job pode ficar em 'sending' antes de ser considerado
// travado (processo caiu entre o claim atômico e a atualização de status).
const STALE_CLAIM_MS = 10 * 60 * 1000

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Avança `date` em `days` dias no calendário local, preservando hora/minuto.
// O Brasil não usa horário de verão desde 2019, então somar dias inteiros no
// calendário local mantém sempre a mesma hora do relógio de parede.
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Calcula a próxima ocorrência FUTURA de um agendamento diário a partir de
// `from`, em relação a `now`.
//
// É proposital que isso seja fechado (closed-form) em vez de iterativo: um
// laço ingênuo do tipo `while (next <= now) next = addDays(next, 1)` partindo
// do `from` original precisaria de uma iteração POR DIA decorrido. Se
// `nextRunAt` estiver muito no passado (corrupção de dado, ou o servidor
// ficou meses fora do ar), isso pode significar milhares de iterações a cada
// tick — ex.: um `from` de 1970 levaria ~20.000 voltas do laço.
//
// Em vez disso, calculamos de uma vez quantos dias inteiros já se passaram
// entre `from` e `now` (aritmética simples de diferença de tempo) e avançamos
// tudo em UM único passo. Depois disso, um pequeno laço de correção — que na
// prática nunca passa de 1 ou 2 voltas — ajusta o caso em que o salto ainda
// não é suficiente (ex.: o horário do dia calculado ainda não chegou) e
// garante que o resultado final fique estritamente no futuro.
const nextDailyOccurrence = (from: Date, now: Date): Date => {
  const diffMs = now.getTime() - from.getTime()
  // Dias inteiros já decorridos. Nunca negativo: se `from` ainda está no
  // futuro, não avançamos nada além do que o laço de correção decidir.
  const daysElapsed = Math.max(0, Math.floor(diffMs / MS_PER_DAY))

  let next = addDays(from, daysElapsed)

  // Laço de correção: no máximo 1-2 voltas, nunca proporcional aos dias
  // decorridos.
  while (next.getTime() <= now.getTime()) {
    next = addDays(next, 1)
  }

  return next
}

// Converte o `nextRunAt` guardado no banco para Date, devolvendo null quando o
// valor está ausente ou é inválido. Sem essa checagem uma linha corrompida
// viraria Invalid Date, o BSON gravaria isso como epoch (1970) sem lançar, e o
// job passaria a ser reivindicado e disparado uma vez a mais a cada tick até se
// autocorrigir. Preferimos transformar corrupção silenciosa em falha explícita.
const asDate = (value: unknown): Date | null => {
  const date = value instanceof Date ? value : new Date(value as string)
  return isNaN(date.getTime()) ? null : date
}

let ticking = false

// Um tick completo do agendador: primeiro recupera jobs travados em
// 'sending', depois reivindica e dispara jobs vencidos um de cada vez.
const tick = async (): Promise<void> => {
  if (ticking) return
  ticking = true

  try {
    if (!isPushConfigured()) return

    const db = await getDb()
    const collection = db.collection('scheduled_notifications')
    const now = new Date()

    // 1) Recupera jobs travados em 'sending' havia mais de STALE_CLAIM_MS —
    // sinal de que o processo caiu entre o claim atômico e a atualização de
    // status final. Também trata jobs 'sending' sem `claimedAt` (linhas
    // reivindicadas por uma versão anterior do código, antes desse campo
    // existir) como travadas.
    //
    // Importante: NÃO redisparamos esses jobs. Não há como saber se o envio
    // original já chegou aos usuários antes do processo cair — reenviar
    // arriscaria disparar a mesma notificação em duplicidade para todo mundo.
    // Preferimos pular a execução perdida e deixar isso visível/rastreável
    // (lastResult / log) a arriscar duplicidade silenciosa.
    const staleCutoff = new Date(now.getTime() - STALE_CLAIM_MS)
    const staleJobs = await collection
      .find({
        status: 'sending',
        $or: [{ claimedAt: { $lte: staleCutoff } }, { claimedAt: { $exists: false } }]
      })
      .toArray()

    for (const job of staleJobs) {
      try {
        const from = job.type === 'daily' ? asDate(job.nextRunAt) : null

        if (job.type === 'daily' && from) {
          // Timestamp fresco aqui, e não o `now` do início do tick: o tick pode
          // ter levado minutos processando outros jobs, e reaproveitar o `now`
          // antigo poderia gerar um nextRunAt que já nasceu no passado — o que
          // dispararia um envio extra no tick seguinte.
          const nextRunAt = nextDailyOccurrence(from, new Date())
          await collection.updateOne(
            { _id: job._id },
            {
              $set: { status: 'active', nextRunAt, lastResult: { interrupted: true } },
              $unset: { claimedAt: '' }
            }
          )
          console.log(
            `[scheduler] Job diário travado recuperado, execução perdida pulada: "${job.title}" (${job._id})`
          )
        } else if (job.type === 'daily') {
          // Diário com nextRunAt inválido: não dá para calcular a próxima
          // ocorrência, então encerramos o job em vez de deixá-lo travado.
          await collection.updateOne(
            { _id: job._id },
            {
              $set: { status: 'done', lastResult: { interrupted: true, invalidSchedule: true } },
              $unset: { claimedAt: '' }
            }
          )
          console.error(
            `[scheduler] Job diário travado com nextRunAt inválido, encerrado: "${job.title}" (${job._id})`
          )
        } else {
          await collection.updateOne(
            { _id: job._id },
            {
              $set: { status: 'done', lastResult: { interrupted: true } },
              $unset: { claimedAt: '' }
            }
          )
          console.log(
            `[scheduler] Job travado recuperado, marcado como concluído: "${job.title}" (${job._id})`
          )
        }
      } catch (err) {
        console.error('[scheduler] Falha ao recuperar job travado:', job._id, err)
      }
    }

    // 2) Reivindica e dispara jobs vencidos, um de cada vez. O claim é
    // atômico (findOneAndUpdate com sort) para que duas instâncias do
    // processo nunca disparem o mesmo job em paralelo.
    while (true) {
      const job = await collection.findOneAndUpdate(
        { status: 'active', nextRunAt: { $lte: now } },
        { $set: { status: 'sending', claimedAt: new Date() } },
        { sort: { nextRunAt: 1 }, returnDocument: 'after' }
      )

      if (!job) break

      try {
        const dispatchResult = await dispatchToAllSubscriptions({
          title: job.title,
          body: job.body,
          url: job.url || '/',
          icon: job.icon || DEFAULT_PUSH_ICON
        })

        console.log(`[scheduler] Notificação "${job.title}" disparada (${job._id}):`, dispatchResult)

        const from = job.type === 'daily' ? asDate(job.nextRunAt) : null

        if (job.type === 'daily' && from) {
          // Timestamp fresco (ver comentário na recuperação acima): o `now` do
          // início do tick pode já estar velho depois de disparar vários jobs.
          const nextRunAt = nextDailyOccurrence(from, new Date())
          await collection.updateOne(
            { _id: job._id },
            { $set: { status: 'active', nextRunAt, lastSentAt: new Date(), lastResult: dispatchResult } }
          )
        } else if (job.type === 'daily') {
          // Diário com nextRunAt inválido: já disparou, mas não há como
          // reagendar. Encerra em vez de deixar o job travado em 'sending'.
          await collection.updateOne(
            { _id: job._id },
            {
              $set: {
                status: 'done',
                lastSentAt: new Date(),
                lastResult: { ...dispatchResult, invalidSchedule: true }
              }
            }
          )
          console.error(
            `[scheduler] Job diário com nextRunAt inválido, encerrado após disparar: "${job.title}" (${job._id})`
          )
        } else {
          await collection.updateOne(
            { _id: job._id },
            { $set: { status: 'done', lastSentAt: new Date(), lastResult: dispatchResult } }
          )
        }
      } catch (err) {
        // Um job com erro no disparo não pode abortar o tick inteiro — os
        // próximos jobs vencidos continuam sendo processados normalmente.
        console.error('[scheduler] Falha ao disparar job agendado:', job._id, err)
      }
    }
  } catch (err) {
    // Sem Mongo disponível (ou qualquer outra falha inesperada), o tick
    // simplesmente falha silenciosamente no log — o `setInterval` nunca pode
    // morrer por causa disso.
    console.error('[scheduler] Erro no tick do agendador de notificações:', err)
  } finally {
    ticking = false
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __notificationSchedulerStarted: boolean | undefined
}

// Registra o agendador de notificações agendadas ('once' e 'daily'). Roda
// dentro do próprio processo Nitro — sem worker/cron externo.
export default defineNitroPlugin(() => {
  // Guarda contra hot-reload do dev server, que reexecuta os plugins Nitro
  // sem reiniciar o processo Node — sem isso, cada reload criaria um novo
  // setInterval concorrente.
  if (globalThis.__notificationSchedulerStarted) return
  globalThis.__notificationSchedulerStarted = true

  console.log('[scheduler] Agendador de notificações iniciado.')

  // Primeiro tick logo após o boot, para pegar jobs que venceram enquanto o
  // servidor estava fora do ar; os ticks seguintes rodam a cada TICK_INTERVAL_MS.
  setTimeout(() => {
    void tick()
  }, FIRST_TICK_DELAY_MS)

  setInterval(() => {
    void tick()
  }, TICK_INTERVAL_MS)
})
