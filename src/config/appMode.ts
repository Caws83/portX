/** App deployment mode — production (default) or future Sepolia testnet scaffold */
export type AppMode = 'production' | 'testnet'

const rawMode = import.meta.env.VITE_APP_MODE?.trim().toLowerCase()

export const APP_MODE: AppMode = rawMode === 'testnet' ? 'testnet' : 'production'

export const IS_TESTNET_MODE = APP_MODE === 'testnet'

export const APP_MODE_BADGE_LABEL =
  APP_MODE === 'testnet' ? 'Testnet Mode' : 'Production Preview'

export const APP_MODE_BANNER_MESSAGE = IS_TESTNET_MODE
  ? 'Testnet mode uses Sepolia assets only. No real funds are used.'
  : 'Live execution disabled. Preview mode only.'
