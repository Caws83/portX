import { decodeErrorResult, type Hex } from 'viem'
import { BUNDLE_EXECUTOR_ERROR_ABI } from '@/services/bundleExecutorContract'

const ROUTER_CALL_FAILED = '0x7319c696'
const SLIPPAGE_EXCEEDED = '0x8199f5f3'
const ROUTER_NOT_ALLOWED = '0xc665406f'
const INVALID_FEE_RECIPIENT = '0x768dc598'

export type TestnetTradeDirection = 'buy' | 'sell'

export interface FormatTestnetExecutionErrorOptions {
  direction?: TestnetTradeDirection
}

function resolveIsSell(options?: FormatTestnetExecutionErrorOptions): boolean {
  return options?.direction === 'sell'
}

export function decodeBundleExecutorRevert(
  data: Hex | undefined,
  options?: FormatTestnetExecutionErrorOptions,
): string | null {
  if (!data || data.length < 10) return null

  const isSell = resolveIsSell(options)
  const selector = data.slice(0, 10).toLowerCase()

  try {
    const decoded = decodeErrorResult({
      abi: BUNDLE_EXECUTOR_ERROR_ABI,
      data,
    })

    if (decoded.errorName === 'RouterCallFailed') {
      const legIndex = decoded.args?.[0]
      const maxLeg = 2n ** 256n - 1n
      if (typeof legIndex === 'bigint' && legIndex === maxLeg) {
        return isSell
          ? 'Swap router call failed — sell quote may be stale or pool liquidity moved. Refresh the sell preview and try again.'
          : 'Swap router call failed — buy quote may be stale or pool liquidity moved. Refresh the buy preview and try again.'
      }
      return isSell
        ? `Swap leg ${String(legIndex)} failed on Sepolia router. Check token approvals and try a fresh sell preview.`
        : `Swap leg ${String(legIndex)} failed on Sepolia router. Try a fresh buy preview with sufficient Sepolia ETH.`
    }

    if (decoded.errorName === 'SlippageExceeded') {
      return isSell
        ? 'Slippage exceeded — refresh the sell preview and try again.'
        : 'Slippage exceeded — refresh the buy preview and try again.'
    }

    if (decoded.errorName === 'RouterNotAllowed') {
      return 'Swap router is not allowlisted on the execution contract.'
    }

    if (decoded.errorName === 'InvalidFeeRecipient') {
      return 'Protocol fee recipient is not configured on Sepolia.'
    }

    return decoded.errorName
  } catch {
    if (selector === ROUTER_CALL_FAILED) {
      return isSell
        ? 'Swap router call failed — refresh the sell preview and ensure portfolio token approvals are set.'
        : 'Swap router call failed — refresh the buy preview and ensure your wallet has enough Sepolia ETH.'
    }
    if (selector === SLIPPAGE_EXCEEDED) {
      return isSell
        ? 'Slippage exceeded — refresh the sell preview and try again.'
        : 'Slippage exceeded — refresh the buy preview and try again.'
    }
    if (selector === ROUTER_NOT_ALLOWED) {
      return 'Swap router is not allowlisted on the execution contract.'
    }
    if (selector === INVALID_FEE_RECIPIENT) {
      return 'Protocol fee recipient is not configured on Sepolia.'
    }
    return null
  }
}

export function formatTestnetSimulationError(
  error: unknown,
  direction: TestnetTradeDirection,
): string {
  const isSell = direction === 'sell'
  const message = error instanceof Error ? error.message : String(error)

  if (/RouterCallFailed|7319c696/i.test(message)) {
    return isSell
      ? 'One sell route failed on Sepolia. Refresh quote or increase slippage.'
      : 'One buy route failed on Sepolia. Refresh the buy preview or increase slippage.'
  }

  if (isSell) {
    return 'Sell simulation failed — refresh quote and try again.'
  }

  return formatTestnetExecutionError(error, { direction: 'buy' })
}

export function formatTestnetExecutionError(
  error: unknown,
  options?: FormatTestnetExecutionErrorOptions,
): string {
  const isSell = resolveIsSell(options)
  const message = error instanceof Error ? error.message : String(error)

  if (/insufficient allowance|allowance/i.test(message)) {
    return isSell
      ? 'Approve USDC protocol fee before selling.'
      : 'Insufficient allowance for this buy — refresh the buy preview and try again.'
  }

  const hexMatch = message.match(/0x[a-fA-F0-9]+/)
  if (hexMatch) {
    const decoded = decodeBundleExecutorRevert(hexMatch[0] as Hex, options)
    if (decoded) {
      if (/RouterCallFailed|7319c696/i.test(decoded) || /router call failed/i.test(decoded)) {
        return isSell
          ? 'One sell route failed on Sepolia. Refresh quote or increase slippage.'
          : 'One buy route failed on Sepolia. Refresh the buy preview or increase slippage.'
      }
      return decoded
    }
  }

  if (message.includes('User rejected')) {
    return 'Transaction cancelled in wallet.'
  }

  if (/RouterCallFailed|7319c696/i.test(message)) {
    return isSell
      ? 'One sell route failed on Sepolia. Refresh quote or increase slippage.'
      : 'One buy route failed on Sepolia. Refresh the buy preview or increase slippage.'
  }

  return isSell
    ? 'Sepolia sell execution failed. Refresh the preview, approve required tokens, and try again.'
    : 'Sepolia buy execution failed. Refresh the buy preview, confirm Sepolia ETH balance, and try again.'
}

export const BUNDLE_EXECUTOR_ERROR_SELECTORS = {
  RouterCallFailed: ROUTER_CALL_FAILED,
  SlippageExceeded: SLIPPAGE_EXCEEDED,
  RouterNotAllowed: ROUTER_NOT_ALLOWED,
  InvalidFeeRecipient: INVALID_FEE_RECIPIENT,
} as const
