import type { BundleExecutorFeeConfig } from '@/services/bundleExecutorContract'

/** Protocol fee amount from a gross amount and bps (floor division). */
export function calculateProtocolFeeAmount(amount: bigint, feeBps: number): bigint {
  if (feeBps <= 0 || amount <= 0n) return 0n
  return (amount * BigInt(feeBps)) / 10_000n
}

/**
 * Gross-up msg.value so that after the contract skims buyFeeBps from msg.value,
 * the remaining ETH equals `legEthWei`.
 */
export function grossUpEthValueForBuyFee(
  legEthWei: bigint,
  feeConfig: BundleExecutorFeeConfig | null,
): bigint {
  if (!feeConfig?.feesEnabled || feeConfig.buyFeeBps <= 0 || legEthWei <= 0n) {
    return legEthWei
  }
  const bps = BigInt(feeConfig.buyFeeBps)
  return (legEthWei * 10_000n) / (10_000n - bps)
}

export function estimateBuyProtocolFee(
  legEthWei: bigint,
  feeConfig: BundleExecutorFeeConfig | null,
): bigint {
  if (!feeConfig?.feesEnabled || feeConfig.buyFeeBps <= 0 || legEthWei <= 0n) {
    return 0n
  }
  const msgValue = grossUpEthValueForBuyFee(legEthWei, feeConfig)
  return calculateProtocolFeeAmount(msgValue, feeConfig.buyFeeBps)
}

export function estimateSellProtocolFee(
  totalOutputWei: bigint,
  feeConfig: BundleExecutorFeeConfig | null,
): bigint {
  if (!feeConfig?.feesEnabled || feeConfig.sellFeeBps <= 0 || totalOutputWei <= 0n) {
    return 0n
  }
  return calculateProtocolFeeAmount(totalOutputWei, feeConfig.sellFeeBps)
}

export function formatProtocolFeeBps(feeBps: number): string {
  return `${(feeBps / 100).toFixed(2)}%`
}

export function isFeeCollectionActive(feeConfig: BundleExecutorFeeConfig | null): boolean {
  if (!feeConfig?.feesEnabled) return false
  return feeConfig.buyFeeBps > 0 || feeConfig.sellFeeBps > 0
}
