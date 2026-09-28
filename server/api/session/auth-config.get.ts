/**
 * Config público de auth da casa. A routes-eb expunha a config de captcha da
 * marca (/api/auth-configs); o proxy velvet não tem equivalente, então o login
 * segue sem captcha. Se a API passar a exigir um, o próprio /auth/login
 * devolve o erro.
 * ponytail: resposta fixa; volte a consultar o upstream se o velvet ganhar
 * uma rota de auth-configs.
 */
const DISABLED = {
  enableCaptcha: false,
  enableCaptchaLogin: false,
  captchaServices: [] as string[],
  turnstileSiteKey: '',
  captchaStyle: 'dark' as const,
}

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return DISABLED
})
