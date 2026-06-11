import { formatEther, formatUnits } from 'viem'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { TESTNET_DEFAULT_SWAP_AMOUNT_WEI } from '@/config/testnetExecution'
import type { ExecutionPlan } from '@/types/execution'
import type { QuoteProvider } from '@/types/route'

export type TestnetSwapHistoryStatus = 'success' | 'failed'

export interface TestnetSwapHistoryRecord {
  txHash: string
  chainId: number
  explorerUrl: string
  basketLabel: string
  routeLabel: string
  inputAmount: string
  outputAmount: string
  provider: QuoteProvider | string
  timestamp: number
  status: TestnetSwapHistoryStatus
}

const STORAGE_KEY = 'portx-testnet-swap-history'
const MAX_RECORDS = 10

export const TESTNET_SWAP_HISTORY_UPDATED_EVENT = 'portx-testnet-swap-history-updated'

function formatStoredAmount(amount: string, decimals: number, symbol: string): string {
  if (amount.includes('.')) {
    return `${amount} ${symbol}`
  }
  try {
    const value = Number.parseFloat(formatUnits(BigInt(amount), decimals))
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${symbol}`
  } catch {
    return `${amount} ${symbol}`
  }
}

export function shouldShowRecentTestSwaps(): boolean {
  return ENABLE_TESTNET_MODE || loadTestnetSwapHistory().length > 0
}

export function loadTestnetSwapHistory(): TestnetSwapHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TestnetSwapHistoryRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((record) => typeof record?.txHash === 'string' && record.txHash.length > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

export function buildTestnetSwapRecordFromPlan(
  plan: ExecutionPlan,
  params: {
    txHash: string
    explorerUrl: string
    chainId: number
    status: TestnetSwapHistoryStatus
  },
): TestnetSwapHistoryRecord {
  const leg = plan.legs[0]?.quote
  const basketLabel = plan.basketName ?? plan.basketId ?? 'Sepolia test basket'
  const routeLabel =
    leg?.routeSummary?.length > 0
      ? leg.routeSummary.join(' → ')
      : 'Uniswap V3 Sepolia ETH → USDC'

  const inputAmount = leg
    ? formatStoredAmount(leg.inputAmount, leg.inputToken.decimals, leg.inputToken.symbol)
    : `${formatEther(TESTNET_DEFAULT_SWAP_AMOUNT_WEI)} ETH`

  const outputAmount = leg
    ? formatStoredAmount(leg.outputAmount, leg.outputToken.decimals, leg.outputToken.symbol)
    : '—'

  return {
    txHash: params.txHash,
    chainId: params.chainId,
    explorerUrl: params.explorerUrl,
    basketLabel,
    routeLabel,
    inputAmount,
    outputAmount,
    provider: leg?.provider ?? 'uniswap-sepolia',
    timestamp: Date.now(),
    status: params.status,
  }
}

export function saveTestnetSwap(record: TestnetSwapHistoryRecord): void {
  const existing = loadTestnetSwapHistory()
  if (existing.some((item) => item.txHash.toLowerCase() === record.txHash.toLowerCase())) {
    return
  }

  const next = [record, ...existing].slice(0, MAX_RECORDS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(TESTNET_SWAP_HISTORY_UPDATED_EVENT))
}

export function saveTestnetSwapFromPlan(
  plan: ExecutionPlan,
  params: {
    txHash: string
    explorerUrl: string
    chainId: number
    status: TestnetSwapHistoryStatus
  },
): void {
  saveTestnetSwap(buildTestnetSwapRecordFromPlan(plan, params))
}

export function clearTestnetSwapHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(TESTNET_SWAP_HISTORY_UPDATED_EVENT))
}
