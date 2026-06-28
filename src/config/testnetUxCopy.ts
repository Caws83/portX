/** User-facing copy for Sepolia testnet portfolio trading — hides internal contract names */

export const EXECUTION_ROUTER_NAME = 'PortX Execution Router'
export const EXECUTE_PORTFOLIO_TRADE = 'Execute Portfolio Trade'
export const SEPOLIA_PORTFOLIO_TRADE = 'Sepolia Portfolio Trade'
export const TESTNET_TRADING = 'Testnet Trading'
export const TEST_TRADE_PREVIEW = 'Test Trade Preview'
export const PREVIEW_QUOTE_LABEL = 'Preview quote'
export const ASSET_NOT_ROUTEABLE = 'Asset not routeable on this network'

export const TESTNET_BANNER_MESSAGE =
  'Testnet mode uses Sepolia assets only. No real funds are used.'

export const TESTNET_TRADE_NOTE =
  'This is a Sepolia testnet trade. No real funds are used.'

export const TESTNET_DASHBOARD = {
  title: 'Portfolio Dashboard',
  subtitleConnected: 'Wallet connected · Sepolia testnet wallet',
  subtitleDisconnected: 'Connect wallet · Sepolia testnet',
  portfolioSectionTitle: 'Sepolia wallet portfolio',
  portfolioSectionDescription:
    'On-chain wallet assets on Sepolia with testnet estimate pricing.',
  totalValueLabel: 'Portfolio Value',
  largestPositionLabel: 'Largest Position',
  positionsLabel: 'Wallet Assets',
  activeBasketsLabel: 'My Portfolios',
  myPortfoliosTitle: 'My Portfolios',
  myPortfoliosEmptyTitle: 'No portfolios yet',
  myPortfoliosEmptyDescription:
    'Buy a Sepolia portfolio from Baskets — your holdings will appear here automatically.',
  testnetEstimateNote: 'Testnet estimate — not mainnet portfolio data',
  tradeBasketsCta: 'Explore baskets',
  recentTradesTitle: 'Recent trades',
  walletAssetsTitle: 'Wallet assets',
  rebalanceTitle: 'Rebalance status',
} as const

export const SEPOLIA_TESTNET_TRADE_TITLE = 'Sepolia Testnet Trade'

export const TESTNET_BUTTONS = {
  previewPortfolio: 'Preview Portfolio',
  previewSell: 'Preview Sell',
  reviewTrade: 'Review Trade',
  reviewSell: 'Review Sell',
  approveTokens: 'Approve Tokens',
  executeTestnetTrade: 'Execute Testnet Trade',
  executeTestnetSell: 'Execute Testnet Sell',
  executingTestnetTrade: 'Executing Testnet Trade…',
  executingTestnetSell: 'Executing Testnet Sell…',
  confirmDemoExecution: 'Confirm Test Trade Preview',
} as const

export const TESTNET_SUCCESS = {
  buy: 'Testnet trade completed successfully',
  sell: 'Testnet sell completed successfully',
} as const

export const TESTNET_CONFIRM = {
  buy:
    'This sends Sepolia ETH through the PortX Execution Router to buy your portfolio allocation. ' +
    'Test ETH only — continue?',
  sell:
    'This sells your Sepolia portfolio tokens to USDC through the PortX Execution Router. ' +
    'Test assets only — continue?',
} as const

/** Map internal safety gate labels to product copy without changing gate logic */
export function formatSafetyGateLabel(label: string): string {
  const replacements: Record<string, string> = {
    'VITE_APP_MODE=testnet': 'Testnet mode active',
    'VITE_ENABLE_LIVE_EXECUTION=true': 'Testnet trading enabled',
    'BundleExecutor payload valid': 'Trade payload ready',
    'BundleExecutor reachable': `${EXECUTION_ROUTER_NAME} reachable`,
    'All legs use uniswap-sepolia': 'All legs routable on Sepolia',
    'Plan is not demo': 'Live preview quote',
    'Leg routers allowed (SwapRouter02 or WETH wrap)': 'Swap routes verified',
  }
  if (replacements[label]) return replacements[label]
  return label.replace(/BundleExecutor/gi, EXECUTION_ROUTER_NAME)
}

export function formatDisabledReason(reason: string | null): string | null {
  if (!reason) return null
  return reason.replace(/BundleExecutor/gi, EXECUTION_ROUTER_NAME)
}
