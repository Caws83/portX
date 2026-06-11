import { formatEther, formatUnits } from 'viem'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_DEFAULT_SWAP_AMOUNT_WEI } from '@/config/testnetExecution'
import type { ExecutionPlan } from '@/types/execution'
import {
  sumTestnetPlanInputWei,
  sumTestnetPlanOutputAmount,
} from '@/utils/testnetPreview'

export type TestnetPortfolioStatus = 'success' | 'failed'

export interface TestnetPortfolioPosition {
  portfolioId: string
  basketLabel: string
  chainId: number
  txHash: string
  explorerUrl: string
  provider: string
  inputAmountEth: string
  outputAmountUsdc: string
  legsCount: number
  timestamp: number
  status: TestnetPortfolioStatus
}

export interface TestnetPortfolioAggregate {
  totalUsdcReceived: number
  totalEthSpent: number
  executedBaskets: number
  latestPosition: TestnetPortfolioPosition | null
  positions: TestnetPortfolioPosition[]
}

const STORAGE_KEY = 'portx-testnet-portfolio'
const MAX_POSITIONS = 20

export const TESTNET_PORTFOLIO_UPDATED_EVENT = 'portx-testnet-portfolio-updated'

function parseEthAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseUsdcAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function shouldShowTestnetPortfolio(): boolean {
  return ENABLE_TESTNET_MODE || loadTestnetPortfolioPositions().length > 0
}

export function loadTestnetPortfolioPositions(): TestnetPortfolioPosition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TestnetPortfolioPosition[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((position) => typeof position?.txHash === 'string' && position.txHash.length > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

export function getTestnetPortfolioAggregate(): TestnetPortfolioAggregate {
  const positions = loadTestnetPortfolioPositions()
  const successful = positions.filter((position) => position.status === 'success')

  return {
    totalUsdcReceived: successful.reduce(
      (sum, position) => sum + parseUsdcAmount(position.outputAmountUsdc),
      0,
    ),
    totalEthSpent: successful.reduce(
      (sum, position) => sum + parseEthAmount(position.inputAmountEth),
      0,
    ),
    executedBaskets: successful.length,
    latestPosition: positions[0] ?? null,
    positions,
  }
}

function getPlanInputEth(plan: ExecutionPlan): string {
  if (plan.legs.length === 0) {
    return formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)
  }
  return formatEther(sumTestnetPlanInputWei(plan))
}

function getPlanOutputUsdc(plan: ExecutionPlan): string {
  if (plan.legs.length === 0) return '0'
  const decimals = plan.legs[0].quote.outputToken.decimals
  return formatUnits(sumTestnetPlanOutputAmount(plan), decimals)
}

export function buildTestnetPortfolioPositionFromPlan(
  plan: ExecutionPlan,
  params: {
    txHash: string
    explorerUrl: string
    chainId: number
    status: TestnetPortfolioStatus
  },
): TestnetPortfolioPosition {
  const basketLabel = plan.basketName ?? plan.basketId ?? 'Sepolia test basket'
  const basketKey = plan.basketId ?? basketLabel.replace(/\s+/g, '-').toLowerCase()

  return {
    portfolioId: `${basketKey}-${params.txHash.slice(0, 10)}`,
    basketLabel,
    chainId: params.chainId,
    txHash: params.txHash,
    explorerUrl: params.explorerUrl,
    provider: plan.legs[0]?.quote.provider ?? 'uniswap-sepolia',
    inputAmountEth: getPlanInputEth(plan),
    outputAmountUsdc: getPlanOutputUsdc(plan),
    legsCount: plan.legs.length,
    timestamp: Date.now(),
    status: params.status,
  }
}

export function saveTestnetPortfolioPosition(position: TestnetPortfolioPosition): void {
  const existing = loadTestnetPortfolioPositions()
  if (existing.some((item) => item.txHash.toLowerCase() === position.txHash.toLowerCase())) {
    return
  }

  const next = [position, ...existing].slice(0, MAX_POSITIONS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(TESTNET_PORTFOLIO_UPDATED_EVENT))
}

export function saveTestnetPortfolioFromPlan(
  plan: ExecutionPlan,
  params: {
    txHash: string
    explorerUrl: string
    chainId: number
    status: TestnetPortfolioStatus
  },
): void {
  saveTestnetPortfolioPosition(buildTestnetPortfolioPositionFromPlan(plan, params))
}
