import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'

export interface FeatureFlags {
  enableLiveExecution: boolean
  enableTestnetMode: boolean
}

export function useFeatureFlags(): FeatureFlags {
  return {
    enableLiveExecution: ENABLE_LIVE_EXECUTION,
    enableTestnetMode: ENABLE_TESTNET_MODE,
  }
}
