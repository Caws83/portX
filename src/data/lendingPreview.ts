/** Illustrative lending preview data — not live product terms. */

export const PREVIEW_FOOTNOTE =
  'PortX Loans are currently in preview. Borrowing, repayment, and collateral locking will go live after protocol testing and audits.'

export const WAITLIST_MAILTO =
  'mailto:team@portxofficial.com?subject=PortX%20Lending%20Waitlist'

export const LOAN_TERM_OPTIONS = [30, 90, 180] as const
export type LoanTermDays = (typeof LOAN_TERM_OPTIONS)[number]

export const LTV_TIER_OPTIONS = [
  { id: 'conservative', label: 'Conservative', ltv: 45 },
  { id: 'standard', label: 'Standard', ltv: 50 },
  { id: 'growth', label: 'Growth', ltv: 60 },
] as const

export type LtvTierId = (typeof LTV_TIER_OPTIONS)[number]['id']

/** Illustrative LTV boost when NFT holder toggle is on. */
export const NFT_HOLDER_LTV_BOOST = 5

export const LIQUIDATION_LEVELS = [
  {
    ltv: 70,
    title: 'Health warning',
    description: 'Early signal to add collateral or repay before stress escalates.',
    accent: 'warning' as const,
  },
  {
    ltv: 80,
    title: 'Partial liquidation zone',
    description: 'Automated partial unwind may begin to restore loan health.',
    accent: 'caution' as const,
  },
  {
    ltv: 90,
    title: 'Full liquidation risk',
    description: 'Maximum stress threshold — full collateral action may be required.',
    accent: 'danger' as const,
  },
]

export const FEE_TIERS_BY_TERM: Record<
  LoanTermDays,
  { label: string; standardRate: string; nftRate: string }
> = {
  30: {
    label: 'Short-term',
    standardRate: '0.8% origination',
    nftRate: '0.6% origination',
  },
  90: {
    label: 'Standard',
    standardRate: '1.2% origination',
    nftRate: '0.9% origination',
  },
  180: {
    label: 'Extended',
    standardRate: '1.8% origination',
    nftRate: '1.3% origination',
  },
}

export interface LendingPortfolioExample {
  id: string
  name: string
  portfolioValueUsd: number
  standardLtvPercent: number
  borrowLimitUsd: number
  nftHolderBorrowLimitUsd: number
  description: string
  accent: 'green' | 'blue' | 'cyan'
}

export const LENDING_PORTFOLIO_EXAMPLES: LendingPortfolioExample[] = [
  {
    id: 'btc-treasury',
    name: 'BTC Treasury Portfolio',
    portfolioValueUsd: 10_000,
    standardLtvPercent: 50,
    borrowLimitUsd: 5_000,
    nftHolderBorrowLimitUsd: 5_500,
    description: 'Bitcoin-heavy basket with conservative collateral haircuts.',
    accent: 'green',
  },
  {
    id: 'defi-blue-chips',
    name: 'DeFi Blue Chips',
    portfolioValueUsd: 5_000,
    standardLtvPercent: 45,
    borrowLimitUsd: 2_250,
    nftHolderBorrowLimitUsd: 2_750,
    description: 'ETH, LINK, and top DeFi tokens — moderate LTV preview.',
    accent: 'blue',
  },
  {
    id: 'stable-yield',
    name: 'Stable Yield',
    portfolioValueUsd: 8_000,
    standardLtvPercent: 60,
    borrowLimitUsd: 4_800,
    nftHolderBorrowLimitUsd: 5_400,
    description: 'Lower-volatility yield basket with higher illustrative LTV.',
    accent: 'cyan',
  },
]

export const LENDING_STEPS = [
  {
    step: 1,
    title: 'Buy or hold a PortX basket',
    description: 'Build or copy a diversified portfolio without leaving the PortX app.',
  },
  {
    step: 2,
    title: 'Lock eligible portfolio assets',
    description: 'Collateral stays in your control — non-custodial by design.',
  },
  {
    step: 3,
    title: 'Borrow USDC against collateral',
    description: 'Access liquidity while keeping exposure to your basket allocation.',
  },
  {
    step: 4,
    title: 'Repay anytime to unlock',
    description: 'Close the loan on your schedule and release collateral when ready.',
  },
] as const

export const LOAN_TIERS = [
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Core access at launch',
    highlight: false,
    perks: [
      'Up to 50% LTV',
      '30 / 90 / 180 day terms',
      'Standard platform fees',
      'Eligible blue-chip baskets only',
    ],
    footnote: 'Illustrative — subject to protocol approval.',
  },
  {
    id: 'nft-holder',
    name: 'NFT Holder',
    tagline: 'Enhanced flexibility for holders',
    highlight: true,
    perks: [
      'Higher flexibility',
      'Longer repayment windows',
      'Lower platform fees',
      'Priority lending access',
      'Enhanced LTV eligibility where risk allows',
    ],
    footnote: 'Illustrative — subject to protocol approval.',
  },
  {
    id: 'founder',
    name: 'Founder / Early NFT',
    tagline: 'Best available preview tier',
    highlight: false,
    perks: [
      'Best available fee tier',
      'Extended repayment flexibility',
      'Priority access to future lending pools',
      'Potential revenue-share eligibility if enabled later',
    ],
    footnote: 'Illustrative — subject to protocol approval.',
  },
] as const

export const NFT_UTILITY_BENEFITS = [
  {
    title: 'Lower borrowing fees',
    description: 'Illustrative fee discounts on eligible loan previews.',
  },
  {
    title: 'More flexible repayment windows',
    description: 'Extended term options where protocol risk allows.',
  },
  {
    title: 'Priority access before public launch',
    description: 'Early queue for lending pool access during rollout.',
  },
  {
    title: 'Better loan terms for eligible baskets',
    description: 'Enhanced LTV headroom on approved collateral baskets.',
  },
  {
    title: 'Potential future rewards utility',
    description:
      'Potential future rewards / fee-share eligibility subject to final tokenomics.',
  },
] as const
