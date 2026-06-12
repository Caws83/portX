import { formatUsd } from '@/utils/format'
import type {
  TestnetRebalanceLeg,
  TestnetRebalancePreviewResult,
  TestnetRebalanceSymbol,
} from '@/services/testnetRebalance'

export const TESTNET_REBALANCE_SIMULATION_WARNING =
  'Simulation only — no swap route or transaction is generated.' as const

export type TestnetSimulatedRebalanceAction = 'buy' | 'sell' | 'balanced'

export type TestnetRebalanceDirection = 'inbound' | 'outbound' | 'none'

export type TestnetRebalanceSimulationStatus = 'balanced' | 'rebalance_needed'

export interface TestnetRebalanceSimulatedLeg {
  symbol: TestnetRebalanceSymbol
  simulatedAction: TestnetSimulatedRebalanceAction
  actionLabel: string
  currentPercent: number
  targetPercent: number
  differencePercent: number
  estimatedValueToMoveUsd: number
  estimatedValueToMoveDisplay: string
  direction: TestnetRebalanceDirection
  directionLabel: string
}

export interface TestnetRebalanceSimulationResult {
  warning: typeof TESTNET_REBALANCE_SIMULATION_WARNING
  status: TestnetRebalanceSimulationStatus
  statusMessage: string
  actions: TestnetRebalanceSimulatedLeg[]
  actionCount: number
  totalEstimatedValueToRebalanceUsd: number
  totalEstimatedValueToRebalanceDisplay: string
  largestMove: {
    symbol: TestnetRebalanceSymbol
    estimatedValueToMoveUsd: number
    estimatedValueToMoveDisplay: string
    actionLabel: string
  } | null
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100
}

function getSimulatedActionLabel(
  symbol: TestnetRebalanceSymbol,
  simulatedAction: TestnetSimulatedRebalanceAction,
): string {
  if (simulatedAction === 'balanced') return 'Already Balanced'

  if (simulatedAction === 'buy') {
    return `Buy / increase ${symbol}`
  }

  return `Sell / reduce ${symbol}`
}

function mapLegToSimulatedAction(
  leg: TestnetRebalanceLeg,
  totalPortfolioValueUsd: number,
): TestnetRebalanceSimulatedLeg {
  const simulatedAction: TestnetSimulatedRebalanceAction =
    leg.action === 'increase' ? 'buy' : leg.action === 'decrease' ? 'sell' : 'balanced'

  const direction: TestnetRebalanceDirection =
    simulatedAction === 'buy' ? 'inbound' : simulatedAction === 'sell' ? 'outbound' : 'none'

  const directionLabel =
    direction === 'inbound'
      ? 'Inbound (add allocation)'
      : direction === 'outbound'
        ? 'Outbound (trim allocation)'
        : 'No move required'

  const estimatedValueToMoveUsd =
    simulatedAction === 'balanced'
      ? 0
      : roundUsd((Math.abs(leg.differencePercent) / 100) * totalPortfolioValueUsd)

  return {
    symbol: leg.symbol,
    simulatedAction,
    actionLabel: getSimulatedActionLabel(leg.symbol, simulatedAction),
    currentPercent: leg.currentPercent,
    targetPercent: leg.targetPercent,
    differencePercent: leg.differencePercent,
    estimatedValueToMoveUsd,
    estimatedValueToMoveDisplay: formatUsd(estimatedValueToMoveUsd),
    direction,
    directionLabel,
  }
}

export function computeTestnetRebalanceSimulation(params: {
  preview: TestnetRebalancePreviewResult
  totalPortfolioValueUsd: number
}): TestnetRebalanceSimulationResult {
  const { preview, totalPortfolioValueUsd } = params

  const actions: TestnetRebalanceSimulatedLeg[] = preview.legs.map((leg) =>
    mapLegToSimulatedAction(leg, totalPortfolioValueUsd),
  )

  const actionable = actions.filter((action) => action.simulatedAction !== 'balanced')
  const actionCount = actionable.length

  const totalEstimatedValueToRebalanceUsd = roundUsd(
    actionable
      .filter((action) => action.simulatedAction === 'sell')
      .reduce((sum, action) => sum + action.estimatedValueToMoveUsd, 0),
  )

  const largestMove = actionable.reduce<TestnetRebalanceSimulationResult['largestMove']>(
    (current, action) => {
      if (!current || action.estimatedValueToMoveUsd > current.estimatedValueToMoveUsd) {
        return {
          symbol: action.symbol,
          estimatedValueToMoveUsd: action.estimatedValueToMoveUsd,
          estimatedValueToMoveDisplay: action.estimatedValueToMoveDisplay,
          actionLabel: action.actionLabel,
        }
      }
      return current
    },
    null,
  )

  const isBalanced = actionCount === 0

  return {
    warning: TESTNET_REBALANCE_SIMULATION_WARNING,
    status: isBalanced ? 'balanced' : 'rebalance_needed',
    statusMessage: isBalanced
      ? 'Portfolio is within target range.'
      : 'Rebalance simulation suggests allocation moves.',
    actions,
    actionCount,
    totalEstimatedValueToRebalanceUsd,
    totalEstimatedValueToRebalanceDisplay: formatUsd(totalEstimatedValueToRebalanceUsd),
    largestMove,
  }
}
