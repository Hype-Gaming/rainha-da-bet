export default defineEventHandler((event) => {
  const turnstile = 'https://challenges.cloudflare.com'
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = ["'self'", "'unsafe-inline'", turnstile, ...(isDev ? ["'unsafe-eval'"] : [])]
  const connectSrc = [
    "'self'", turnstile, 'https:', 'wss:', 'ws:',
    ...(isDev ? ['http://localhost:*', 'http://127.0.0.1:*'] : [])
  ]

  setHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src ${scriptSrc.join(' ')}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src 'self' data: blob: https: ${turnstile}`,
      `connect-src ${connectSrc.join(' ')}`,
      'frame-src https:',
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ')
  })
})
