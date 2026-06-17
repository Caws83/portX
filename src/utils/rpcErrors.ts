export const SIMULATION_RPC_TIMEOUT_MESSAGE =
  'Simulation RPC timed out. Add VITE_ALCHEMY_KEY or retry with a reliable RPC.'

function isRpcTimeoutOrFailure(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('took too long') ||
    lower.includes('rpc unavailable') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('socket hang up') ||
    lower.includes('fetch failed')
  )
}

/** Map viem/wagmi RPC errors to pilot-friendly simulation messages. */
export function formatSimulationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (isRpcTimeoutOrFailure(message)) {
    return SIMULATION_RPC_TIMEOUT_MESSAGE
  }
  return message
}

export function isSimulationRpcFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return isRpcTimeoutOrFailure(message)
}
