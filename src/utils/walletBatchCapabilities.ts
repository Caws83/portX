/** Parsed EIP-5792 batch capability flags for wallet_sendCalls approval bundling. */
export interface WalletBatchCapabilityResult {
  supportsBatchApprovals: boolean
  supportsAtomicBatch: boolean
  reason: string | null
}

type AtomicCapability = {
  status?: 'supported' | 'ready' | 'unsupported' | string
}

type ChainCapabilities = {
  atomic?: AtomicCapability
  paymasterService?: { supported?: boolean }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeChainIdKey(chainId: number): string[] {
  return [String(chainId), `0x${chainId.toString(16)}`]
}

/** Resolve per-chain capability object from wallet_getCapabilities payload. */
export function resolveChainCapabilities(
  capabilities: unknown,
  chainId: number,
): ChainCapabilities | null {
  if (!isRecord(capabilities)) return null

  for (const key of normalizeChainIdKey(chainId)) {
    const entry = capabilities[key]
    if (isRecord(entry)) return entry as ChainCapabilities
  }

  if ('atomic' in capabilities || 'paymasterService' in capabilities) {
    return capabilities as ChainCapabilities
  }

  return null
}

function atomicStatus(
  chainCapabilities: ChainCapabilities | null,
): AtomicCapability['status'] | undefined {
  return chainCapabilities?.atomic?.status
}

/**
 * Parse wagmi `useCapabilities` / wallet_getCapabilities data for batch approval support.
 * Defaults to sequential approvals when capabilities are missing or unsupported.
 */
export function parseWalletBatchCapabilities(
  capabilities: unknown,
  chainId: number,
): WalletBatchCapabilityResult {
  if (!capabilities) {
    return {
      supportsBatchApprovals: false,
      supportsAtomicBatch: false,
      reason: 'Wallet did not report EIP-5792 capabilities.',
    }
  }

  const chainCapabilities = resolveChainCapabilities(capabilities, chainId)
  if (!chainCapabilities) {
    return {
      supportsBatchApprovals: false,
      supportsAtomicBatch: false,
      reason: 'Wallet capabilities are unavailable for the required chain.',
    }
  }

  const status = atomicStatus(chainCapabilities)
  const supportsAtomicBatch = status === 'supported' || status === 'ready'
  const supportsBatchApprovals = supportsAtomicBatch

  if (supportsBatchApprovals) {
    return {
      supportsBatchApprovals: true,
      supportsAtomicBatch,
      reason: null,
    }
  }

  if (status === 'unsupported') {
    return {
      supportsBatchApprovals: false,
      supportsAtomicBatch: false,
      reason: 'Wallet does not support batch transactions on this chain.',
    }
  }

  return {
    supportsBatchApprovals: false,
    supportsAtomicBatch: false,
    reason: 'Wallet batch approvals require atomic EIP-5792 support.',
  }
}
