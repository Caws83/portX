import { ENABLE_LIVE_EXECUTION } from '@/config/features'

export interface FeatureFlags {
  enableLiveExecution: boolean
}

export function useFeatureFlags(): FeatureFlags {
  return {
    enableLiveExecution: ENABLE_LIVE_EXECUTION,
  }
}
