import type { QuoteResponse } from '@/types/quote'
import type { CalldataStatus } from '@/types/execution'
import { TESTNET_WETH_ADDRESS } from '@/config/testnetExecution'
import type { BundleExecutorSwapCall } from '@/services/bundleExecutorContract'
import type { BasketQuotePreview } from '@/types/quote'
import { isZeroAddress, ZERO_ADDRESS } from '@/utils/addresses'

/** WETH9.deposit() — 4-byte selector; valid on-chain but fails generic length checks */
export const WETH_DEPOSIT_CALLDATA = '0xd0e30db0'

const DEMO_CALLDATA_MARKERS = ['_DEMO_CALLDATA', '_DEMO_']

function isValidRouterAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address) && !isZeroAddress(address)
}

function isValidCalldata(calldata: string): boolean {
  if (!calldata?.startsWith('0x')) return false
  const body = calldata.slice(2)
  if (body.length < 16) return false
  if (!/^[0-9a-fA-F]+$/.test(body)) return false
  if (/^0+$/.test(body)) return false
  if (DEMO_CALLDATA_MARKERS.some((marker) => calldata.includes(marker))) return false
  return true
}

export function isWethDepositCalldata(data: string | null | undefined): boolean {
  return data?.toLowerCase() === WETH_DEPOSIT_CALLDATA
}

/** Accepts WETH deposit selector-only payloads and standard ABI-encoded router calldata */
export function isValidBundleSwapCalldata(data: string | null | undefined): boolean {
  if (!data?.startsWith('0x')) return false
  if (isWethDepositCalldata(data)) return true
  return isValidCalldata(data)
}

export function isTestnetUniswapSepoliaQuote(quote: QuoteResponse): boolean {
  return quote.provider === 'uniswap-sepolia'
}

function isValidHexAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

export function isTestnetWethWrapQuote(quote: QuoteResponse): boolean {
  if (quote.testnetSwap?.wethWrap) return true
  if (quote.provider !== 'uniswap-sepolia') return false
  if (isWethDepositCalldata(quote.calldata)) return true
  const router = quote.routerAddress?.toLowerCase()
  const out = quote.outputToken.symbol.toUpperCase()
  const ethIn =
    quote.inputToken.symbol.toUpperCase() === 'ETH' || quote.inputToken.address === ZERO_ADDRESS
  return router === TESTNET_WETH_ADDRESS.toLowerCase() && out === 'WETH' && ethIn
}

export function isTestnetErc20SellQuote(quote: QuoteResponse): boolean {
  if (quote.testnetSwap?.nativeEth === false) return true
  if (quote.provider !== 'uniswap-sepolia') return false
  const ethIn =
    quote.inputToken.symbol.toUpperCase() === 'ETH' || quote.inputToken.address === ZERO_ADDRESS
  return !ethIn && quote.outputToken.symbol.toUpperCase() === 'USDC'
}

/** Quote-time calldata for Sepolia legs is rebuilt at execute time from testnetSwap metadata */
export function isQuoteCalldataReadyForBundle(quote: QuoteResponse): boolean {
  if (!isTestnetUniswapSepoliaQuote(quote)) {
    return isValidCalldata(quote.calldata)
  }

  if (!isValidRouterAddress(quote.routerAddress)) {
    return false
  }

  if (isTestnetWethWrapQuote(quote)) {
    return true
  }

  const swap = quote.testnetSwap
  if (swap) {
    if (swap.nativeEth === false) {
      return isValidHexAddress(swap.tokenIn) && isValidHexAddress(swap.tokenOut)
    }
    return isValidHexAddress(swap.tokenOut)
  }

  return isValidBundleSwapCalldata(quote.calldata)
}

/** Testnet-aware calldata status for review UI — does not affect mainnet 0x validation */
export function getTestnetCalldataStatus(quote: QuoteResponse, isDemoPlan: boolean): CalldataStatus {
  if (quote.provider === 'unsupported') return 'unsupported'
  if (isDemoPlan) return 'demo'

  if (isTestnetUniswapSepoliaQuote(quote)) {
    if (isQuoteCalldataReadyForBundle(quote)) {
      return 'available'
    }
    return 'missing'
  }

  if (quote.provider === '0x' && isValidCalldata(quote.calldata) && isValidRouterAddress(quote.routerAddress)) {
    return 'available'
  }

  if (isValidCalldata(quote.calldata) && isValidRouterAddress(quote.routerAddress)) {
    return 'available'
  }

  return 'missing'
}

type ReadyBundleResult = {
  status: 'ready'
  swapCalls: BundleExecutorSwapCall[]
  legCount: number
  basketId: `0x${string}`
  totalNativeEthWei: bigint
}

type BundleDebugResult =
  | ReadyBundleResult
  | { status: 'validation_errors'; errors: Array<{ code: string; message: string; field?: string }> }

export interface BundleSwapCallDebugRow {
  legIndex: number
  router: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  minAmountOut: string
  valueWei: string
  calldataLength: number
  calldataPreview: string
}

export function buildBundleSwapCallDebugRows(
  _preview: BasketQuotePreview,
  result: ReadyBundleResult,
): BundleSwapCallDebugRow[] {
  return result.swapCalls.map((swapCall, legIndex) => {
    const legValue = swapCall.tokenIn === ZERO_ADDRESS ? swapCall.amountIn : 0n

    return swapCallToDebugRow(swapCall, legIndex, legValue)
  })
}

function swapCallToDebugRow(
  swapCall: BundleExecutorSwapCall,
  legIndex: number,
  valueWei: bigint,
): BundleSwapCallDebugRow {
  return {
    legIndex,
    router: swapCall.router,
    tokenIn: swapCall.tokenIn,
    tokenOut: swapCall.tokenOut,
    amountIn: swapCall.amountIn.toString(),
    minAmountOut: swapCall.minAmountOut.toString(),
    valueWei: valueWei.toString(),
    calldataLength: swapCall.data.length,
    calldataPreview: swapCall.data.slice(0, 18),
  }
}

/** Dev-only — compare frontend SwapCalls against smoke-script shape */
export function logBundleSwapCallsDebug(
  preview: BasketQuotePreview,
  result: BundleDebugResult,
  context?: { recipient?: string; label?: string },
): void {
  if (!import.meta.env.DEV) return

  const label = context?.label ?? 'BundleExecutor SwapCalls'
  if (result.status !== 'ready') {
    console.groupCollapsed(`[PortX] ${label} — validation errors`)
    console.table(result.errors)
    console.groupEnd()
    return
  }

  console.groupCollapsed(`[PortX] ${label} — ${result.legCount} leg(s)`)
  console.table(buildBundleSwapCallDebugRows(preview, result))
  console.log('basketId', result.basketId)
  console.log('totalNativeEthWei', result.totalNativeEthWei.toString())
  console.log('recipient', context?.recipient ?? '(none)')
  console.groupEnd()
}
