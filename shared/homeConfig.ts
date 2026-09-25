export interface HomeLink { label: string; icon: string; href: string; description?: string; image?: string; external?: boolean }
export interface HomeBanner { image: string; href: string; external?: boolean }

export interface HomeConfig {
  tenant: string
  liveTitle: string
  liveAt: string
  liveHref: string
  heroVideo: string
  banners: HomeBanner[]
  xpLabel: string
  xpCurrent: number
  xpGoal: number
  members: number
  playingNow: number
  shortcuts: HomeLink[]
  connectionLinks: HomeLink[]
}

export const HOME_TENANT = 'rainha-da-bet'

export const DEFAULT_HOME_CONFIG: HomeConfig = {
  tenant: HOME_TENANT,
  liveTitle: 'Próxima live de alavancagem',
  liveAt: 'Hoje, às 20:00',
  liveHref: 'https://t.me/+bL3Px9mB3oJkNzdh',
  heroVideo: '',
  banners: [{ image: '/banners/ENTRE-NA-MINHA-COMUNIDADE-DUDA.png', href: 'https://chat.whatsapp.com/LtELxASK4F07hY2GShxVAv?s=cl&p=i&ilr=1', external: true }],
  xpLabel: 'Seu progresso',
  xpCurrent: 340,
  xpGoal: 500,
  members: 2478,
  playingNow: 186,
  shortcuts: [
    { label: 'Roleta diária', icon: 'ph:spinner-ball-bold', href: '/roleta' },
    { label: 'Torneios', icon: 'ph:trophy-bold', href: '/torneio' },
    { label: 'Aulas', icon: 'ph:graduation-cap-bold', href: '/aulas' },
    { label: 'Gestão', icon: 'ph:chart-line-up-bold', href: '/gestao' }
  ],
  connectionLinks: [
    { label: 'Gestão de Banca', icon: 'ph:calculator-bold', href: '/gestao' },
    { label: 'Aulas', icon: 'ph:graduation-cap-bold', href: '/aulas' },
    { label: 'WhatsApp', icon: 'ph:whatsapp-logo-bold', href: 'https://chat.whatsapp.com/LtELxASK4F07hY2GShxVAv?s=cl&p=i&ilr=1', external: true },
    { label: 'Instagram', icon: 'ph:instagram-logo-bold', href: 'https://www.instagram.com/mariainvest_/', external: true },
    { label: 'Telegram', icon: 'ph:telegram-logo-bold', href: 'https://t.me/+bL3Px9mB3oJkNzdh', external: true }
  ]
}
