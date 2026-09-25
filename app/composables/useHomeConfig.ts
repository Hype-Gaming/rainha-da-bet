import { DEFAULT_HOME_CONFIG, type HomeConfig } from '../../shared/homeConfig'

export const useHomeConfig = () => {
  const config = useState<HomeConfig>('home-config', () => structuredClone(DEFAULT_HOME_CONFIG))
  const loadHomeConfig = async () => {
    config.value = await $fetch<HomeConfig>('/api/home-config').catch(() => structuredClone(DEFAULT_HOME_CONFIG))
  }
  return { homeConfig: config, loadHomeConfig }
}
