<template>
  <div class="el">
    <div v-for="(item, i) in items" :key="i" class="el-row">
      <label class="el-thumb" :aria-label="`Imagem de ${item.label || 'atalho'}`">
        <img v-if="item.image" :src="item.image" alt=""><Icon v-else :name="item.icon || 'ph:star-bold'" />
        <input type="file" accept="image/*" @change="pick($event, i)">
      </label>
      <button v-if="item.image" type="button" class="el-x" aria-label="Voltar ao ícone" @click="item.image = ''"><Icon name="ph:x-bold" /></button>
      <input v-model="item.label" class="adm-input" placeholder="Título" maxlength="60">
      <input v-model="item.href" class="adm-input" placeholder="Link" maxlength="500">
      <input v-model="item.icon" class="adm-input" placeholder="ph:star-bold" maxlength="80">
      <label v-if="withDescription" class="el-wide"><input v-model="item.description" class="adm-input" placeholder="Descrição" maxlength="160"></label>
      <label class="el-ext"><input v-model="item.external" type="checkbox"> Externo</label>
      <button type="button" class="adm-btn-ghost" aria-label="Remover" @click="items.splice(i, 1)"><Icon name="ph:trash-bold" /></button>
    </div>
    <button type="button" class="adm-btn-ghost" @click="items.push({ label: '', icon: 'ph:star-bold', href: '', external: false })"><Icon name="ph:plus-bold" /> Adicionar</button>
  </div>
</template>
<script setup lang="ts">
import type { HomeLink } from '../../shared/homeConfig'
const items = defineModel<HomeLink[]>({ required: true })
defineProps<{ withDescription?: boolean }>()
const pick = async (event: Event, i: number) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) items.value[i]!.image = await resizeImage(file, { square: 128 })
}
</script>
<style scoped>
.el { display: grid; gap: 12px; }
.el-row { display: grid; grid-template-columns: 56px 1fr 1fr 130px auto auto; gap: 8px; align-items: center; position: relative; }
.el-thumb { width: 56px; height: 56px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; border: 1px dashed #ffffff40; cursor: pointer; font-size: 22px; }
.el-thumb img { width: 100%; height: 100%; object-fit: cover; }
.el-thumb input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.el-thumb:focus-within { outline: 2px solid var(--adm-accent, #fb65a6); }
.el-x { position: absolute; left: 40px; top: -6px; width: 22px; height: 22px; border: 0; border-radius: 50%; background: #333; color: #fff; cursor: pointer; }
.el-wide { grid-column: 2 / -1; }
.el-ext { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
@media (max-width: 720px) { .el-row { grid-template-columns: 56px 1fr; } .el-wide { grid-column: 1 / -1; } }
</style>
