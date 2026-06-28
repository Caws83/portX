import { decodeErrorResult, type Hex } from 'viem'
import { BUNDLE_EXECUTOR_ERROR_ABI } from '@/services/bundleExecutorContract'

const ROUTER_CALL_FAILED = '0x7319c696'
const SLIPPAGE_EXCEEDED = '0x8199f5f3'
const ROUTER_NOT_ALLOWED = '0xc665406f'
const INVALID_FEE_RECIPIENT = '0x768dc598'

export function decodeBundleExecutorRevert(data: Hex | undefined): string | null {
  if (!data || data.length < 10) return null

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
        return 'Swap router call failed — quote may be stale or pool liquidity moved. Try preview again.'
      }
      return `Swap leg ${String(legIndex)} failed on Sepolia router. Check token approval and try a fresh sell preview.`
    }

    if (decoded.errorName === 'SlippageExceeded') {
      return 'Slippage exceeded — refresh the sell preview and try again.'
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
      return 'Swap router call failed — refresh the sell preview and ensure portfolio token approvals are set.'
    }
    if (selector === SLIPPAGE_EXCEEDED) {
      return 'Slippage exceeded — refresh the sell preview and try again.'
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

export function formatTestnetExecutionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (/insufficient allowance|allowance/i.test(message)) {
    return 'Approve USDC protocol fee before selling.'
  }

  const hexMatch = message.match(/0x[a-fA-F0-9]+/)
  if (hexMatch) {
    const decoded = decodeBundleExecutorRevert(hexMatch[0] as Hex)
    if (decoded) return decoded
  }

  if (message.includes('User rejected')) {
    return 'Transaction cancelled in wallet.'
  }

  if (/RouterCallFailed|7319c696/i.test(message)) {
    return 'Swap router call failed — refresh the sell preview and confirm token approvals.'
  }

  return 'Sepolia sell execution failed. Refresh the preview, approve required tokens, and try again.'
}

export const BUNDLE_EXECUTOR_ERROR_SELECTORS = {
  RouterCallFailed: ROUTER_CALL_FAILED,
  SlippageExceeded: SLIPPAGE_EXCEEDED,
  RouterNotAllowed: ROUTER_NOT_ALLOWED,
  InvalidFeeRecipient: INVALID_FEE_RECIPIENT,
} as const
