import type { ExecutionPlan } from '@/types/execution'
import { mainnet } from 'viem/chains'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import { PILOT_MIN_AMOUNT_WARNING, PILOT_MIN_BUY_AMOUNT_USD } from '@/config/constants'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'

export type MainnetPilotQuoteSource = 'api' | 'fallback' | 'testnet' | null

export interface MainnetPilotCheck {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export interface MainnetPilotAssessment {
  eligible: boolean
  disabledReason: string | null
  checks: MainnetPilotCheck[]
  passingChecks: MainnetPilotCheck[]
  failingChecks: MainnetPilotCheck[]
}

export interface MainnetPilotContext {
  quoteSource: MainnetPilotQuoteSource
  walletConnected: boolean
  currentChainId?: number
  flagEnabled: boolean
}

function legFromPlan(plan: ExecutionPlan) {
  return plan.legs[0]
}

export function assessMainnetPilotEligibility(
  plan: ExecutionPlan | null,
  context: MainnetPilotContext
): MainnetPilotAssessment {
  const checks: MainnetPilotCheck[] = []

  const add = (id: string, label: string, passed: boolean, detail?: string) => {
    checks.push({ id, label, passed, detail })
  }

  if (!plan) {
    return {
      eligible: false,
      disabledReason: 'No execution plan',
      checks,
      passingChecks: [],
      failingChecks: [],
    }
  }

  if (
    ENABLE_TESTNET_MODE &&
    (context.quoteSource === 'testnet' ||
      isTestnetSepoliaUniswapPlan(plan) ||
      (context.currentChainId === TESTNET_SEPOLIA_CHAIN_ID &&
        plan.legs.every((leg) => leg.quote.provider === 'uniswap-sepolia')))
  ) {
    return {
      eligible: false,
      disabledReason: null,
      checks: [],
      passingChecks: [],
      failingChecks: [],
    }
  }

  add(
    'flag',
    'Mainnet pilot flag enabled',
    context.flagEnabled,
    context.flagEnabled ? 'VITE_ENABLE_MAINNET_EXECUTION=true' : 'Disabled by default'
  )
  add('buy_only', 'Buy plan only', plan.type === 'buy', plan.type)
  add('single_leg', 'Single leg only', plan.legs.length === 1, `${plan.legs.length} leg(s)`)
  add('live_quote', 'Live quote (not demo)', !plan.isDemo, plan.isDemo ? 'Demo quote' : 'Live')
  add(
    'api_source',
    'Quote from PortX API',
    context.quoteSource === 'api',
    context.quoteSource ?? 'unknown'
  )
  add(
    'mainnet_chain',
    'Ethereum mainnet (chain 1)',
    plan.chainId === mainnet.id,
    `chainId ${plan.chainId}`
  )
  add(
    'wallet_network',
    'Wallet on Ethereum mainnet',
    context.walletConnected && context.currentChainId === mainnet.id,
    context.walletConnected
      ? `Wallet chain ${context.currentChainId ?? 'unknown'}`
      : 'Connect wallet'
  )
  add(
    'pilot_min_notional',
    'Pilot minimum notional',
    plan.totalInputUsd >= PILOT_MIN_BUY_AMOUNT_USD,
    plan.totalInputUsd < PILOT_MIN_BUY_AMOUNT_USD
      ? PILOT_MIN_AMOUNT_WARNING
      : `${plan.totalInputUsd} USDC`
  )

  const leg = legFromPlan(plan)
  const quote = leg?.quote
  const execution = quote?.execution

  add(
    'zero_x_provider',
    '0x live provider',
    quote?.provider === '0x',
    quote?.provider ?? 'unknown'
  )
  add(
    'no_unsupported',
    'No unsupported legs',
    plan.legs.every((l) => l.quote.provider !== 'unsupported'),
    'Unsupported token routing blocked'
  )
  add(
    'executable_calldata',
    'Executable calldata',
    execution?.hasExecutableCalldata === true,
    execution?.hasExecutableCalldata ? 'Present' : 'Missing'
  )
  add(
    'exact_sell_amount',
    'Exact sell amount',
    execution?.hasExactSellAmount === true,
    execution?.sellAmount ?? 'Missing sellAmount'
  )
  add(
    'transaction_to',
    'transaction.to present',
    Boolean(execution?.transactionTo),
    execution?.transactionTo ?? 'Missing'
  )
  add(
    'transaction_data',
    'transaction.data present',
    Boolean(execution?.transactionData),
    execution?.transactionData ? `${execution.transactionData.length} chars` : 'Missing'
  )

  const eligible = checks.every((c) => c.passed)
  const firstFail = checks.find((c) => !c.passed)

  return {
    eligible,
    disabledReason: eligible ? null : (firstFail?.detail ?? firstFail?.label ?? 'Not eligible'),
    checks,
    passingChecks: checks.filter((c) => c.passed),
    failingChecks: checks.filter((c) => !c.passed),
  }
}

const BLOCKER_MESSAGES: Record<string, string> = {
  flag: 'Feature flag disabled — set VITE_ENABLE_MAINNET_EXECUTION=true for internal testing.',
  buy_only: 'Sell plans are not supported by the mainnet pilot.',
  single_leg: 'Multi-leg basket — the pilot only supports single-leg buys.',
  live_quote: 'Demo quote — a live PortX API quote is required.',
  api_source: 'Local fallback quote — connect to the PortX API for live execution data.',
  mainnet_chain: 'Wrong network — quote plan must be on Ethereum mainnet (chain 1).',
  wallet_network: 'Wrong network — switch your wallet to Ethereum mainnet (chain 1).',
  pilot_min_notional: PILOT_MIN_AMOUNT_WARNING,
  zero_x_provider: 'No live 0x route on this leg.',
  no_unsupported: 'Unsupported token — one or more legs cannot route on Ethereum.',
  executable_calldata: 'Missing executable calldata from the 0x quote.',
  exact_sell_amount: 'Missing exact sellAmount from the 0x quote.',
  transaction_to: 'Missing transaction.to from the 0x quote.',
  transaction_data: 'Missing transaction.data from the 0x quote.',
}

export function getMainnetPilotBlockerMessages(
  checks: MainnetPilotCheck[],
  options?: { approvalRequired?: boolean; legCount?: number }
): string[] {
  const messages: string[] = []
  const seen = new Set<string>()

  for (const check of checks.filter((c) => !c.passed)) {
    let message = BLOCKER_MESSAGES[check.id]
    if (check.id === 'single_leg' && options?.legCount != null) {
      message = `Multi-leg basket (${options.legCount} legs) — the pilot only supports single-leg buys.`
    }
    if (message && !seen.has(message)) {
      seen.add(message)
      messages.push(message)
    }
  }

  if (options?.approvalRequired) {
    const approvalMsg = 'Missing approval — approve the input token for the AllowanceHolder before executing.'
    if (!seen.has(approvalMsg)) messages.push(approvalMsg)
  }

  return messages
}

export function formatQuoteSourceLabel(source: MainnetPilotQuoteSource): string {
  if (source === 'api') return 'PortX API'
  if (source === 'fallback') return 'Local fallback'
  if (source === 'testnet') return 'Sepolia testnet'
  return 'Unknown'
}

export function formatWalletChainLabel(chainId: number | undefined, connected: boolean): string {
  if (!connected) return 'Wallet not connected'
  if (chainId === mainnet.id) return `Ethereum mainnet (${chainId})`
  if (chainId == null) return 'Unknown chain'
  return `Chain ${chainId} — switch to Ethereum mainnet (1)`
}
