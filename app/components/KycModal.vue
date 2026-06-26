<template>
  <Teleport to="body">
    <div v-if="show" class="kyc-modal-overlay">
      <div class="kyc-modal">
        <div class="kyc-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4"/>
            <path d="M12 16h.01"/>
          </svg>
        </div>
        
        <h2 class="kyc-title">Verificação KYC Obrigatória</h2>
        
        <p class="kyc-description">
          Para acessar a <strong>Rainha da Bet</strong>, você precisa completar a verificação de identidade (KYC) na sua conta da casa de apostas.
        </p>
        
        <div class="kyc-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span class="step-text">Acesse sua conta na {{ brandName }}</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span class="step-text">Vá em Configurações > Verificação</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-text">Envie seus documentos e selfie</span>
          </div>
          <div class="step">
            <span class="step-number">4</span>
            <span class="step-text">Aguarde a aprovação (até 24h)</span>
          </div>
        </div>
        
        <a
          :href="affiliateUrl"
          target="_blank"
          class="kyc-button"
          @click="handleRedirect"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Fazer Verificação KYC Agora
        </a>
        
        <p class="kyc-note">
          Após a verificação ser aprovada, faça login novamente para acessar.
        </p>
        
        <button class="logout-button" @click="handleLogout">
          Sair e fazer login depois
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  logout: []
}>()

const { brandName, affiliateUrl } = useAuth()

const handleRedirect = () => {
  // Redirecionar automaticamente após 500ms
  setTimeout(() => {
    window.open(affiliateUrl.value, '_blank')
  }, 100)
}

const handleLogout = () => {
  emit('logout')
}

// Redirecionar automaticamente após 3 segundos
let redirectTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.show, (newVal) => {
  if (newVal) {
    redirectTimeout = setTimeout(() => {
      window.open(affiliateUrl.value, '_blank')
    }, 3000)
  } else if (redirectTimeout) {
    clearTimeout(redirectTimeout)
  }
})

onUnmounted(() => {
  if (redirectTimeout) {
    clearTimeout(redirectTimeout)
  }
})
</script>

<style scoped>
.kyc-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.kyc-modal {
  background: rgba(10, 14, 28, 0.96);
  border: 2px solid rgba(0, 163, 255, 0.4);
  border-radius: 20px;
  padding: 40px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 
    0 0 50px rgba(0, 163, 255, 0.25),
    0 0 80px rgba(255, 34, 67, 0.12);
  animation: modalAppear 0.3s ease-out;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.kyc-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: rgba(0, 163, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #00a3ff;
}

.kyc-icon svg {
  width: 40px;
  height: 40px;
  color: #00a3ff;
}

.kyc-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.kyc-description {
  color: #aaa;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 28px;
}

.kyc-description strong {
  color: #00a3ff;
}

.kyc-steps {
  background: rgba(0, 163, 255, 0.05);
  border: 1px solid rgba(0, 163, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 28px;
  text-align: left;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.step:last-child {
  border-bottom: none;
}

.step-number {
  width: 28px;
  height: 28px;
  background: #00a3ff;
  color: #000;
  font-weight: 700;
  font-size: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  color: #ddd;
  font-size: 14px;
}

.kyc-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #00a3ff, #ff2243);
  color: #000;
  font-weight: 700;
  font-size: 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(0, 163, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(0, 163, 255, 0);
  }
}

.kyc-button:hover {
  background: linear-gradient(135deg, #00ddff, #00aadd);
  transform: translateY(-2px);
}

.kyc-button svg {
  width: 20px;
  height: 20px;
}

.kyc-note {
  margin-top: 20px;
  color: #888;
  font-size: 13px;
  line-height: 1.5;
}

.logout-button {
  margin-top: 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #888;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-button:hover {
  border-color: #ff4444;
  color: #ff4444;
}

@media (max-width: 480px) {
  .kyc-modal {
    padding: 28px 20px;
  }
  
  .kyc-title {
    font-size: 20px;
  }
  
  .kyc-icon {
    width: 64px;
    height: 64px;
  }
  
  .kyc-icon svg {
    width: 32px;
    height: 32px;
  }
}
</style>
