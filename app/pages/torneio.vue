<template>
  <main class="page" :style="themeStyle">
    <NuxtLink to="/" class="back"><Icon name="ph:arrow-left-bold"/> Voltar</NuxtLink>
    <div class="wrap">
      <header class="head">
        <span class="eyebrow">COMPETIÇÃO</span>
        <h1>{{ t?.title || 'Torneio' }}</h1>
        <p v-if="t?.description">{{ t.description }}</p>
        <div v-if="t" class="deadline">
          <div class="row"><strong><Icon name="ph:timer-bold"/> {{ remaining }}</strong><span>até {{ endLabel }}</span></div>
          <div class="bar" role="progressbar" aria-label="Período do torneio decorrido" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="elapsed"><i :style="{width:elapsed+'%'}"/></div>
        </div>
      </header>

      <section v-if="podium.length" class="podium" aria-label="Pódio">
        <article v-for="p in podium" :key="p.position" :class="['step','p'+p.position]">
          <Icon :name="p.position===1?'ph:crown-simple-fill':'ph:medal-fill'" class="medal"/>
          <b>{{ p.position }}º</b><span class="name">{{ p.name }}</span><small>{{ fmt(p.score) }} pts</small>
        </article>
      </section>

      <section v-if="rest.length" class="card" aria-labelledby="rk">
        <h2 id="rk">Classificação</h2>
        <ol class="rank">
          <li v-for="r in rest" :key="r.position">
            <span class="pos">{{ r.position }}º</span><span class="name">{{ r.name }}</span><span class="pts">{{ fmt(r.score) }}</span>
            <div class="bar thin" role="progressbar" :aria-label="`${r.name} em relação ao líder`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="pct(r.score)"><i :style="{width:pct(r.score)+'%'}"/></div>
          </li>
        </ol>
      </section>
      <p v-if="t && !t.ranking.length" class="empty">Ninguém pontuou ainda. Seja o primeiro no pódio!</p>

      <section v-if="t?.prizes.length" class="card" aria-labelledby="pz">
        <h2 id="pz">Premiação</h2>
        <ul class="prizes"><li v-for="p in t.prizes" :key="p.place" :style="{'--m':medal(p.place)}"><Icon name="ph:medal-fill"/><b>{{ p.place }}º</b>{{ p.label }}</li></ul>
      </section>

      <section v-if="t?.rules.length" class="card" aria-labelledby="rl">
        <h2 id="rl">Regras</h2>
        <ul class="rules"><li v-for="r in t.rules" :key="r">{{ r }}</li></ul>
      </section>
      <p v-if="error" class="empty" role="alert">{{ error }}</p>
    </div>
  </main>
</template>
<script setup lang="ts">
import type { Tournament } from '../../shared/tournaments'
definePageMeta({ alias: ['/torneios'] })
const { memberExperience, refreshMemberExperience } = useMemberExperience()
const t = ref<Tournament | null>(null), error = ref(''), now = ref(Date.now())
const color = computed(() => memberExperience.primaryColor || '#ff1493')
const themeStyle = computed(() => ({ '--accent': color.value, '--accent-soft': `color-mix(in srgb, ${color.value} 16%, transparent)` }))
const fmt = (n: number) => n.toLocaleString('pt-BR')
const medal = (n: number) => ['#f5c65b', '#c7cdd6', '#d08a4e'][n - 1] || '#8b8794'
const podium = computed(() => { const r = t.value?.ranking ?? []; return [r[1], r[0], r[2]].filter(Boolean) })
const rest = computed(() => (t.value?.ranking ?? []).filter(r => r.position > 3))
const top = computed(() => Math.max(1, ...(t.value?.ranking ?? []).map(r => r.score)))
const pct = (s: number) => Math.round(s / top.value * 100)
const endMs = computed(() => t.value ? new Date(t.value.endsAt).getTime() : 0)
const elapsed = computed(() => { if (!t.value) return 0; const a = new Date(t.value.startsAt).getTime(); return Math.min(100, Math.max(0, Math.round((now.value - a) / (endMs.value - a) * 100))) })
const remaining = computed(() => { const d = Math.ceil((endMs.value - now.value) / 86400000); return d <= 0 ? 'Encerrado' : d === 1 ? 'Falta 1 dia' : `Faltam ${d} dias` })
const endLabel = computed(() => new Date(endMs.value).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }))
onMounted(async () => {
  refreshMemberExperience().catch(() => {})
  try { t.value = (await $fetch<{ tournament: Tournament }>('/api/tournaments/active')).tournament } catch { error.value = 'Não foi possível carregar o torneio.' }
})
useHead({ title: 'Torneio' })
</script>
<style scoped>
.page{min-height:100vh;padding:76px 18px 48px;overflow-x:clip;position:relative;color:#f8f6fa;background:linear-gradient(160deg,#09090d,#050507);font-family:Manrope,sans-serif}
.page::before{content:"";position:absolute;top:-120px;left:50%;width:720px;height:420px;transform:translateX(-50%);background:radial-gradient(closest-side,var(--accent-soft),transparent);filter:blur(30px);pointer-events:none}
.wrap{position:relative;width:min(100%,680px);margin:0 auto;display:grid;gap:18px}
.back{position:absolute;top:-56px;left:0;min-height:44px;padding:0 12px;display:flex;gap:8px;align-items:center;color:#d0cbd1;text-decoration:none;border-radius:12px;transition:.18s}
.back:hover,.back:focus-visible{color:#fff;background:#ffffff0b;outline:2px solid var(--accent)}
.eyebrow{color:color-mix(in srgb,var(--accent) 65%,white);font-size:11px;font-weight:900;letter-spacing:.14em}
.head h1{margin:8px 0;font-size:clamp(32px,8vw,52px);line-height:1.05;letter-spacing:-.04em}.head p{color:#b7b3bc;line-height:1.6;margin:0}
.deadline,.card{padding:18px 20px;border:1px solid #ffffff18;border-radius:22px;background:color-mix(in srgb,#16151d 82%,transparent);box-shadow:0 30px 80px #0009;backdrop-filter:blur(20px)}
.deadline{margin-top:18px}.row{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.row strong{display:flex;gap:7px;align-items:center;color:color-mix(in srgb,var(--accent) 65%,white)}.row span{color:#b7b3bc}
.bar{height:8px;border-radius:9px;background:#ffffff14;overflow:hidden}.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 60%,white));transition:width .6s cubic-bezier(.16,1,.3,1)}.bar.thin{height:5px;grid-column:1/-1}
.podium{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:end}
.step{display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px 6px;min-width:0;text-align:center;border:1px solid var(--c);border-radius:20px;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 18%,transparent),#ffffff05)}
.step .name{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800}.step small{color:#c5c2ca}.step b{font-size:22px;color:var(--c)}.medal{font-size:28px;color:var(--c)}
.p1{--c:#f5c65b;padding-block:30px;box-shadow:0 0 40px #f5c65b30}.p1 .medal{font-size:38px}.p2{--c:#c7cdd6}.p3{--c:#d08a4e}
.card h2{margin:0 0 14px;font-size:18px}
.rank,.prizes,.rules{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.rank li{display:grid;grid-template-columns:36px 1fr auto;gap:4px 10px;align-items:center}.pos{color:#b7b3bc;font-weight:800}.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pts{font-weight:800;font-variant-numeric:tabular-nums}
.prizes li{display:flex;gap:10px;align-items:center;min-height:44px;padding:0 12px;border-left:3px solid var(--m);border-radius:10px;background:#ffffff08}.prizes svg{color:var(--m);font-size:20px}.prizes b{color:var(--m)}
.rules li{color:#c5c2ca;line-height:1.55;padding-left:14px;border-left:2px solid var(--accent-soft)}
.empty{text-align:center;color:#b7b3bc;padding:22px;border:1px dashed #ffffff22;border-radius:18px;margin:0}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important}}
</style>
