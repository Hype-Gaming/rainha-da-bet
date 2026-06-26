export default defineNuxtRouteMiddleware((to) => {
  // O painel admin tem auth própria (e-mail + senha, sem Cactus) — não passa por aqui.
  if (to.path.startsWith('/admin')) return

  const { isAuthenticated } = useAuth()

  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/forgot-password']

  if (publicRoutes.includes(to.path)) {
    if (isAuthenticated.value && to.path === '/auth/login') {
      return navigateTo('/')
    }
    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/auth/login')
  }
})
