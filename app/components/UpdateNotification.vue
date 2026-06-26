<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="showUpdateBanner" class="update-banner">
        <div class="update-content">
          <div class="update-icon">
            <Icon name="ph:arrow-circle-up-bold" />
          </div>
          <div class="update-text">
            <strong>Nova atualização disponível!</strong>
            <span>Clique para atualizar o app</span>
          </div>
        </div>
        <div class="update-actions">
          <button class="btn-update" @click="refreshApp">
            <Icon name="ph:arrow-clockwise-bold" />
            Atualizar
          </button>
          <button class="btn-dismiss" @click="dismissUpdate">
            <Icon name="ph:x-bold" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const showUpdateBanner = ref(false)
const newVersion = ref('')

// Escutar mensagens do Service Worker
onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        console.log('[App] Update available:', event.data.version)
        newVersion.value = event.data.version
        showUpdateBanner.value = true
      }
      
      if (event.data?.type === 'REFRESH_PAGE') {
        window.location.reload()
      }
    })

    // Verificar atualizações do SW a cada 30 segundos
    setInterval(() => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update()
      })
    }, 30000)

    // Verificar se há um SW esperando
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        showUpdateBanner.value = true
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner.value = true
            }
          })
        }
      })
    })
  }

  // Também verificar versão diretamente via fetch
  checkVersionDirectly()
  setInterval(checkVersionDirectly, 30000)
})

// Verificar versão diretamente (fallback)
const storedVersion = ref<string | null>(null)

async function checkVersionDirectly() {
  try {
    const response = await fetch('/version.json?t=' + Date.now(), {
      cache: 'no-store'
    })
    if (!response.ok) return
    
    const data = await response.json()
    
    if (storedVersion.value === null) {
      storedVersion.value = data.version
      return
    }
    
    if (data.version !== storedVersion.value) {
      console.log('[App] Version changed:', storedVersion.value, '->', data.version)
      newVersion.value = data.version
      showUpdateBanner.value = true
    }
  } catch (error) {
    console.log('[App] Error checking version:', error)
  }
}

// Atualizar o app
function refreshApp() {
  // Notifica o SW para limpar cache
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('FORCE_REFRESH')
  }
  
  // Força reload ignorando cache
  setTimeout(() => {
    window.location.reload()
  }, 500)
}

// Dispensar notificação
function dismissUpdate() {
  showUpdateBanner.value = false
}
</script>

<style scoped>
.update-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #00ccff 0%, #0099cc 100%);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 204, 255, 0.3);
  z-index: 99999;
  max-width: calc(100% - 40px);
  width: 450px;
}

.update-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.update-icon :deep(svg) {
  font-size: 22px;
  color: #fff;
}

.update-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.update-text strong {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.update-text span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-update {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #fff;
  border: none;
  border-radius: 8px;
  color: #0099cc;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-update:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.02);
}

.btn-update :deep(svg) {
  font-size: 16px;
}

.btn-dismiss {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-dismiss :deep(svg) {
  font-size: 16px;
}

/* Animação */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(100%);
}

/* Mobile */
@media (max-width: 500px) {
  .update-banner {
    flex-direction: column;
    width: calc(100% - 32px);
    bottom: 16px;
  }
  
  .update-content {
    width: 100%;
  }
  
  .update-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .btn-update {
    flex: 1;
    justify-content: center;
  }
}
</style>
