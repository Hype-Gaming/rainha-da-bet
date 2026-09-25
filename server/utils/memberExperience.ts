import { DEFAULT_MEMBER_EXPERIENCE, normalizeHexColor, type MemberExperienceConfig } from '../../shared/memberExperience'

const text = (value: unknown, fallback: string, max: number) =>
  (typeof value === 'string' ? value.trim().slice(0, max) : '') || fallback

export const normalizeMemberExperience = (doc: Record<string, any> | null): MemberExperienceConfig => ({
  tenant: DEFAULT_MEMBER_EXPERIENCE.tenant,
  brandName: text(doc?.brandName, DEFAULT_MEMBER_EXPERIENCE.brandName, 60),
  primaryColor: normalizeHexColor(doc?.primaryColor),
  campaignTitle: text(doc?.campaignTitle, DEFAULT_MEMBER_EXPERIENCE.campaignTitle, 100),
  campaignMessage: text(doc?.campaignMessage, DEFAULT_MEMBER_EXPERIENCE.campaignMessage, 300),
  campaignImage: text(doc?.campaignImage, DEFAULT_MEMBER_EXPERIENCE.campaignImage, 500),
  campaignLink: text(doc?.campaignLink, DEFAULT_MEMBER_EXPERIENCE.campaignLink, 500),
  campaignEnabled: doc?.campaignEnabled !== false,
  supportLink: text(doc?.supportLink, DEFAULT_MEMBER_EXPERIENCE.supportLink, 500),
  shortcuts: Array.isArray(doc?.shortcuts) ? doc.shortcuts.slice(0, 8).map((item: any, index: number) => ({
    label: text(item?.label, `Atalho ${index + 1}`, 40),
    icon: text(item?.icon, 'ph:star-bold', 80),
    href: text(item?.href, '#', 500)
  })) : DEFAULT_MEMBER_EXPERIENCE.shortcuts
})
