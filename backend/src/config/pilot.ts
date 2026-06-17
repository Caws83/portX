/** Recommended minimum total buy amount for internal mainnet pilot quotes */
export const PILOT_MIN_BUY_AMOUNT_USD = 100

/** Minimum per-leg USD notional before calling 0x (below this often returns 400) */
export const PILOT_MIN_LEG_AMOUNT_USD = 10

export const PILOT_MIN_AMOUNT_WARNING = `Pilot test amount too small for 0x route. Try ${PILOT_MIN_BUY_AMOUNT_USD} USDC.`

export const PILOT_WALLET_REQUIRED_WARNING =
  'Connect wallet — 0x quotes require a valid taker address (not the demo wallet).'
