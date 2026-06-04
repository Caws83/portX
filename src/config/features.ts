/** Live on-chain swap execution — disabled by default; enable via VITE_ENABLE_LIVE_EXECUTION=true */
export const ENABLE_LIVE_EXECUTION = import.meta.env.VITE_ENABLE_LIVE_EXECUTION === 'true'

/** Sepolia testnet scaffold — enabled when VITE_APP_MODE=testnet */
export const ENABLE_TESTNET_MODE = import.meta.env.VITE_APP_MODE === 'testnet'
