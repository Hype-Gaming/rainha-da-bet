<template>
  <Teleport to="body">
    <Transition name="roulette-invite">
      <div v-if="modelValue" class="overlay" @click.self="close">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="roulette-invite-title">
          <button class="close" type="button" aria-label="Fechar convite da roleta" @click="close"><Icon name="ph:x-bold" /></button>
          <div class="icon"><Icon name="ph:spinner-gap-bold" /></div>
          <span class="eyebrow"><Icon name="ph:gift-bold" /> BÔNUS DA SORTE</span>
          <h2 id="roulette-invite-title">Sua roleta está te esperando</h2>
          <p>Gire agora e concorra a giros grátis para aproveitar a experiência.</p>
          <div class="actions">
            <NuxtLink to="/roleta" class="cta" @click="close"><Icon name="ph:spinner-gap-bold" /> Girar a roleta</NuxtLink>
            <button type="button" class="later" @click="close">Agora não</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const close = () => emit('update:modelValue', false)
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px);overflow-y:auto}
.modal{position:relative;width:min(410px,100%);margin:auto;padding:33px 28px 28px;border:1px solid #ff14936b;border-radius:26px;background:radial-gradient(circle at 50% 0,#692052,#171217 67%);box-shadow:0 24px 80px #000;text-align:center;color:#fff}
.close{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:50%;background:#ffffff12;color:#fff;cursor:pointer}.icon{display:grid;place-items:center;width:74px;height:74px;margin:0 auto 16px;border:1px solid #ff77bd78;border-radius:50%;background:#ff149326;color:#ff9bce;font-size:37px;box-shadow:0 0 30px #ff14934d}.eyebrow{display:flex;align-items:center;justify-content:center;gap:7px;color:#ff9bce;font-size:11px;font-weight:900;letter-spacing:.14em}.modal h2{margin:10px 0 8px;font-size:27px;line-height:1.1}.modal p{margin:0;color:#d0b4c5;font-size:14px;line-height:1.45}.actions{display:grid;gap:10px;margin-top:25px}.cta,.later{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;cursor:pointer}.cta{background:#ff1493;color:#fff;box-shadow:0 8px 20px #ff14934d}.later{border:0;background:transparent;color:#c9a4ba}.roulette-invite-enter-active,.roulette-invite-leave-active{transition:opacity .2s}.roulette-invite-enter-from,.roulette-invite-leave-to{opacity:0}.roulette-invite-enter-active .modal,.roulette-invite-leave-active .modal{transition:transform .2s ease}.roulette-invite-enter-from .modal,.roulette-invite-leave-to .modal{transform:scale(.94) translateY(12px)}
</style>
