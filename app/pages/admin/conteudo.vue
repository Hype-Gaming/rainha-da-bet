<template>
  <AdminPasswordGate v-if="needsLogin" @authed="load" />
  <main class="adm-page"><div class="adm-aurora"/><div class="adm-wrap">
    <header class="adm-topbar"><NuxtLink to="/admin" class="adm-btn-ghost"><Icon name="ph:arrow-left-bold"/> Dashboard</NuxtLink><div class="adm-logo"><Icon name="ph:layout-bold" class="adm-logo-icon"/><span>Conteúdo da home</span></div></header>

    <section class="adm-panel"><div class="adm-panel-head"><h2><Icon name="ph:broadcast-bold"/> Live e números</h2></div>
      <div class="grid">
        <label>Título da live<input v-model="cfg.liveTitle" class="adm-input" maxlength="100"></label>
        <label>Horário<input v-model="cfg.liveAt" class="adm-input" maxlength="60"></label>
        <label class="wide">Link da live<input v-model="cfg.liveHref" class="adm-input" maxlength="500"></label>
        <label>Rótulo do XP<input v-model="cfg.xpLabel" class="adm-input" maxlength="60"></label>
        <label>XP atual<input v-model.number="cfg.xpCurrent" type="number" min="0" class="adm-input"></label>
        <label>Meta de XP<input v-model.number="cfg.xpGoal" type="number" min="1" class="adm-input"></label>
        <label>Membros<input v-model.number="cfg.members" type="number" min="0" class="adm-input"></label>
        <label>Jogando agora<input v-model.number="cfg.playingNow" type="number" min="0" class="adm-input"></label>
      </div></section>

    <section class="adm-panel"><div class="adm-panel-head"><h2><Icon name="ph:circles-four-bold"/> Atalhos</h2></div><EditorList v-model="cfg.shortcuts" /></section>

    <section class="adm-panel"><div class="adm-panel-head"><div><h2><Icon name="ph:images-bold"/> Banners</h2><p>Proporção ideal 3:1. Banner sem imagem não aparece na home.</p></div></div>
      <div class="banners">
        <div v-for="(b, i) in cfg.banners" :key="i" class="banner-row">
          <label class="banner-thumb" aria-label="Enviar imagem do banner"><img v-if="b.image" :src="b.image" alt=""><Icon v-else name="ph:upload-simple-bold"/><input type="file" accept="image/*" @change="pickBanner($event, i)"></label>
          <input v-model="b.href" class="adm-input" placeholder="Link" maxlength="500">
          <label class="ext"><input v-model="b.external" type="checkbox"> Externo</label>
          <button class="adm-btn-ghost" type="button" aria-label="Remover banner" @click="cfg.banners.splice(i, 1)"><Icon name="ph:trash-bold"/></button>
        </div>
        <button class="adm-btn-ghost" type="button" @click="cfg.banners.push({ image: '', href: '', external: false })"><Icon name="ph:plus-bold"/> Adicionar banner</button>
      </div>
      <label class="wide video">Vídeo do destaque (opcional) <small>URL completa ou caminho; preenchido, substitui o carrossel e vira o vídeo de boas-vindas obrigatório do 1º jogo grátis</small><input v-model="cfg.heroVideo" class="adm-input" maxlength="500"></label>
    </section>

    <section class="adm-panel"><div class="adm-panel-head"><h2><Icon name="ph:link-bold"/> Conecte-se</h2></div><EditorList v-model="cfg.connectionLinks" with-description /></section>

    <div class="savebar"><span v-if="msg" :class="msgType" role="status">{{ msg }}</span><button class="adm-btn-primary" :disabled="saving" @click="save"><Icon name="ph:floppy-disk-bold"/> {{ saving ? 'Salvando...' : 'Salvar alterações' }}</button></div>
  </div></main>
</template>
<script setup lang="ts">
import { DEFAULT_HOME_CONFIG, type HomeConfig } from '../../../shared/homeConfig'
definePageMeta({ middleware: 'admin' })
const { adminFetch, needsLogin } = useAdmin()
const cfg = reactive<HomeConfig>(structuredClone(DEFAULT_HOME_CONFIG))
const saving = ref(false), msg = ref(''), msgType = ref('ok')
const say = (m: string, t = 'ok') => { msg.value = m; msgType.value = t; setTimeout(() => (msg.value = ''), 3500) }
const load = async () => { try { Object.assign(cfg, await adminFetch<HomeConfig>('/api/admin/home-config')) } catch { say('Não foi possível carregar.', 'error') } }
const pickBanner = async (e: Event, i: number) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) cfg.banners[i]!.image = await resizeImage(f, { maxWidth: 1280 })
}
const save = async () => {
  saving.value = true
  try { Object.assign(cfg, await adminFetch<HomeConfig>('/api/admin/home-config', { method: 'PUT', body: cfg })); say('Alterações salvas.') }
  catch { say('Revise os dados e tente de novo.', 'error') }
  finally { saving.value = false }
}
onMounted(load)
</script>
<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; } .grid label, .video { display: grid; gap: 6px; font-size: 13px; } .wide { grid-column: 1 / -1; }
.banners { display: grid; gap: 12px; margin-bottom: 14px; }
.banner-row { display: grid; grid-template-columns: 180px 1fr auto auto; gap: 10px; align-items: center; }
.banner-thumb { position: relative; aspect-ratio: 3/1; display: grid; place-items: center; overflow: hidden; border: 1px dashed #ffffff40; border-radius: 10px; cursor: pointer; }
.banner-thumb img { width: 100%; height: 100%; object-fit: cover; } .banner-thumb input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.banner-thumb:focus-within { outline: 2px solid #fb65a6; } .ext { display: flex; gap: 6px; align-items: center; }
.savebar { position: sticky; bottom: 0; display: flex; justify-content: flex-end; align-items: center; gap: 14px; padding: 14px 0; background: linear-gradient(transparent, #090909 40%); }
.ok { color: #86efac; } .error { color: #ff8796; }
@media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .banner-row { grid-template-columns: 1fr auto; } .banner-thumb { grid-column: 1 / -1; } }
</style>
