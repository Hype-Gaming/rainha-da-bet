export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()
  
  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/forgot-password']
  
  // Se a rota é pública, permitir acesso
  if (publicRoutes.includes(to.path)) {
    // Se já está logado e tenta acessar login, redirecionar para home
    if (isAuthenticated.value && to.path === '/auth/login') {
      return navigateTo('/')
    }
    return
  }
  
  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated.value) {
    return navigateTo('/auth/login')
  }
})
