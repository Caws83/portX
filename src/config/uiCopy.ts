/** Centralized Alpha UI copy — buttons, banners, and empty states */

export const BUTTON_LABELS = {
  previewQuote: 'Preview Quote',
  previewSellQuote: 'Preview Sell Quote',
  previewSellAll: 'Preview Sell All',
  reviewExecute: 'Review & Execute',
  reviewDemoSell: 'Review & Demo Sell',
  copyBasket: 'Copy as Basket',
  copiedBasket: 'Copied to basket',
  sellAll: 'Sell All Portfolio',
  sellAllNav: 'Sell All',
  quotesUnavailable: 'Quotes unavailable (planned chain)',
  fetchingQuotes: 'Fetching quotes…',
  buildingReview: 'Building review…',
  clearPreview: 'Clear preview',
  clearSelection: 'Clear selection',
  retryApi: 'Retry API',
  exploreBaskets: 'Explore baskets',
  viewBaskets: 'View baskets',
} as const

export const LOADING_MESSAGES = {
  baskets: 'Loading baskets from API…',
  portfolio: 'Loading portfolio from API…',
  holdings: 'Loading holdings…',
  discover: 'Loading discover portfolios from API…',
  quotePreview: 'Loading quote preview from API…',
  sellAllQuote: 'Loading sell-all quote from API…',
  tokens: 'Loading tokens from API…',
  basketDetails: 'Loading basket details…',
} as const

export const SUCCESS_MESSAGES = {
  basketsApi: 'Baskets loaded from PortX API',
  portfolioApi: 'Portfolio loaded from PortX API',
  discoverApi: 'Discover portfolios loaded from PortX API',
  quoteApi: 'Quote loaded from PortX API',
  sellAllQuoteApi: 'Sell-all quote loaded from PortX API',
  tokensApi: 'Tokens loaded from PortX API',
  copyBasket: 'Portfolio copied to your baskets.',
  demoSellComplete: 'Demo sell completed.',
} as const

export const WARNING_MESSAGES = {
  apiOfflineFallback: (resource: string) =>
    `API unavailable — showing offline ${resource} data.`,
  quoteFallback: 'Using local quote fallback.',
  sellAllFallback: 'Using local sell-all quote fallback.',
  plannedChainBlocked: 'Planned chain — quotes blocked',
  unsupportedRoute: 'Unsupported route on Ethereum mainnet',
  highSlippage: 'High slippage tolerance — you may receive less than quoted.',
} as const

export const ERROR_MESSAGES = {
  quoteFailed: 'Quote unavailable. Check API connection or try again.',
  sellAllFailed: 'Sell-all quote unavailable. Check API connection or try again.',
  genericApi: 'Could not reach PortX API.',
} as const

export const EMPTY_MESSAGES = {
  noHoldings: {
    title: 'No holdings',
    description: 'Your demo portfolio has no token positions yet.',
  },
  noActiveBaskets: {
    title: 'No active baskets',
    description: 'Buy an Ethereum (Active) basket to start tracking a position.',
  },
  noBaskets: {
    title: 'No baskets available',
    description: 'Could not load baskets. Retry the API or check your connection.',
  },
  noDiscoverNotable: {
    title: 'No portfolios found',
    description: 'Try another chain filter or retry the API.',
  },
  noDiscoverWhale: {
    title: 'No whale portfolios',
    description: 'No whale watch portfolios match this chain in the demo set.',
  },
  noQuotePreview: {
    title: 'No quote preview',
    description:
      'Select Preview Quote on an Ethereum (Active) basket. Planned chains show routing status only.',
  },
  noSellAllHoldings: {
    title: 'Nothing to sell',
    description: 'Add holdings or buy a basket before previewing a sell-all quote.',
  },
  noQuotesPlanned: {
    title: 'Quotes unavailable',
    description: 'Live routing is available for Ethereum (Active) baskets only.',
  },
} as const

export const INFO_MESSAGES = {
  demoMode: 'Demo mode — no on-chain transactions are sent.',
  nonCustodial: 'PortX is non-custodial — you sign every swap from your wallet when live.',
} as const
