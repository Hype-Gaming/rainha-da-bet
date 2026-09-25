import { DEFAULT_MEMBER_EXPERIENCE, type MemberExperienceConfig } from '../../shared/memberExperience'

const memberExperience = reactive<MemberExperienceConfig>({ ...DEFAULT_MEMBER_EXPERIENCE })
const memberExperienceReady = ref(false)

export const useMemberExperience = () => {
  const refreshMemberExperience = async () => {
    try {
      Object.assign(memberExperience, await $fetch<MemberExperienceConfig>('/api/settings/member-experience'))
    } finally {
      memberExperienceReady.value = true
    }
  }
  return {
    memberExperience: readonly(memberExperience),
    memberExperienceReady: readonly(memberExperienceReady),
    refreshMemberExperience
  }
}
