export interface HomeShortcut {
  label: string
  icon: string
  href: string
}

export interface MemberExperienceConfig {
  tenant: string
  brandName: string
  primaryColor: string
  campaignTitle: string
  campaignMessage: string
  campaignImage: string
  campaignLink: string
  campaignEnabled: boolean
  supportLink: string
  shortcuts: HomeShortcut[]
}

export const DEFAULT_MEMBER_EXPERIENCE: MemberExperienceConfig = {
  tenant: 'rainha-da-bet',
  brandName: 'Rainha da Bet',
  primaryColor: '#fb65a6',
  campaignTitle: 'Bem-vinda à comunidade',
  campaignMessage: 'Conteúdos, campanhas e benefícios exclusivos em um só lugar.',
  campaignImage: '/banners/ENTRE-NA-MINHA-COMUNIDADE-DUDA.png',
  campaignLink: 'https://chat.whatsapp.com/LtELxASK4F07hY2GShxVAv?s=cl&p=i&ilr=1',
  campaignEnabled: true,
  supportLink: 'https://wa.me/5571993887915',
  shortcuts: [
    { label: 'Roleta diária', icon: 'ph:spinner-ball-bold', href: '/roleta' },
    { label: 'Torneios', icon: 'ph:trophy-bold', href: '/torneios' },
    { label: 'Aulas', icon: 'ph:graduation-cap-bold', href: '/aulas' },
    { label: 'Gestão', icon: 'ph:chart-line-up-bold', href: '/gestao' }
  ]
}

export const normalizeHexColor = (value: unknown) =>
  /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : DEFAULT_MEMBER_EXPERIENCE.primaryColor
