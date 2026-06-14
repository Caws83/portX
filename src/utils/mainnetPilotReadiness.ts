import type { ExecutionPlan } from '@/types/execution'
import { mainnet } from 'viem/chains'

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
    return { eligible: false, disabledReason: 'No execution plan', checks }
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
  }
}
