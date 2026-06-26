// Estado global de "conta bloqueada". Alimentado pelo heartbeat e pela verificação
// de assinatura; lido pelo overlay em app.vue que trava o app inteiro.
const blockedState = reactive({ blocked: false })

export const useAccountBlocked = () => {
  const setBlocked = (value: boolean) => {
    blockedState.blocked = value
  }

  return {
    isBlocked: computed(() => blockedState.blocked),
    setBlocked
  }
}
