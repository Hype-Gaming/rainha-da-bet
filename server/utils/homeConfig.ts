import { DEFAULT_HOME_CONFIG, HOME_TENANT, type HomeConfig } from '../../shared/homeConfig'
import { getDb } from './mongodb'

export const loadHomeConfig = async (): Promise<HomeConfig> => {
  try {
    const db = await getDb()
    const saved = await db.collection('site_configs').findOne({ tenant: HOME_TENANT })
    if (!saved) return DEFAULT_HOME_CONFIG
    const { _id, ...rest } = saved as any
    return { ...DEFAULT_HOME_CONFIG, ...rest }
  } catch {
    return DEFAULT_HOME_CONFIG
  }
}
