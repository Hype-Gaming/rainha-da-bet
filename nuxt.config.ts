import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { addTemplate, defineNuxtModule } from '@nuxt/kit'

const routeRulesTemplate = 'export default () => ({})\n'

const routeRulesTemplateModule = defineNuxtModule({
  setup(_options, nuxt) {
    addTemplate({
      filename: 'route-rules.mjs',
      getContents: () => routeRulesTemplate
    })

    const writeRouteRulesTemplate = async () => {
      await mkdir(nuxt.options.buildDir, { recursive: true })
      await writeFile(join(nuxt.options.buildDir, 'route-rules.mjs'), routeRulesTemplate)
    }

    nuxt.hook('ready', writeRouteRulesTemplate)
    nuxt.hook('app:templatesGenerated', writeRouteRulesTemplate)
    nuxt.hook('build:before', writeRouteRulesTemplate)
  }
})

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,

  runtimeConfig: {
    public: {
      routesApiBase: process.env.NUXT_PUBLIC_ROUTES_API_BASE || 'https://routes-eb.grupoautoma.com',
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'
    }
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' }
      ]
    }
  },

  css: [],

  modules: [routeRulesTemplateModule, '@nuxt/icon'],

  icon: {
    // 'local' empacota os ícones Phosphor (@iconify-json/ph) no build —
    // zero chamada à API da Iconify em runtime (não some em produção sem internet de saída).
    serverBundle: 'local',
  },

  compatibilityDate: '2024-12-09'
})
