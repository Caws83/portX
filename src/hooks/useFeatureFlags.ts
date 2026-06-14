import { ENABLE_LIVE_EXECUTION, ENABLE_MAINNET_EXECUTION, ENABLE_TESTNET_MODE, SHOW_ALPHA_WARNINGS } from '@/config/features'

export interface FeatureFlags {
  enableLiveExecution: boolean
  enableMainnetExecution: boolean
  enableTestnetMode: boolean
  showAlphaWarnings: boolean
}

export function useFeatureFlags(): FeatureFlags {
  return {
    enableLiveExecution: ENABLE_LIVE_EXECUTION,
    enableMainnetExecution: ENABLE_MAINNET_EXECUTION,
    enableTestnetMode: ENABLE_TESTNET_MODE,
    showAlphaWarnings: SHOW_ALPHA_WARNINGS,
  }
}
