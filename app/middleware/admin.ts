// Protege /admin/* com a auth PRÓPRIA do painel (e-mail + senha, sem Cactus).
// Não redireciona: apenas valida a sessão para a página decidir entre o portão
// de login e o conteúdo. Se a sessão for inválida, a própria página exibe o login.
export default defineNuxtRouteMiddleware(async () => {
  const { checkAdmin } = useAdmin()
  await checkAdmin()
})
