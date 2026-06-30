import { formatEther, formatUnits } from 'viem'
import type { BundleExecutorFeeConfig } from '@/services/bundleExecutorContract'
import {
  formatProtocolFeeBps,
  isFeeCollectionActive,
} from '@/services/protocolFee'
import { formatFeeBps } from '@/hooks/useBundleExecutorFeeConfig'
import { truncateAddress } from '@/utils/format'
import { AdvancedDisclosure } from '@/components/ui/AdvancedDisclosure'

interface TestnetProtocolFeeSummaryProps {
  feeConfig: BundleExecutorFeeConfig | null
  isAvailable: boolean
  isLoading?: boolean
  /** Estimated fee for the current trade */
  estimatedFee?: {
    amount: bigint
    symbol: string
    decimals: number
    isBuy: boolean
    rateLabel: string
  } | null
  /** Net output after fee (sell USDC wei) */
  netOutputWei?: bigint
  netOutputSymbol?: string
  netOutputDecimals?: number
  compact?: boolean
  showRecipientInAdvanced?: boolean
}

export function TestnetProtocolFeeSummary({
  feeConfig,
  isAvailable,
  isLoading,
  estimatedFee,
  netOutputWei,
  netOutputSymbol = 'USDC',
  netOutputDecimals = 6,
  compact = false,
  showRecipientInAdvanced = true,
}: TestnetProtocolFeeSummaryProps) {
  if (isLoading) {
    return <p className="text-xs text-portx-muted">Loading protocol fees…</p>
  }

  if (!isAvailable || !feeConfig) {
    return (
      <p className="text-xs text-portx-muted">
        Protocol fee settings unavailable for this network.
      </p>
    )
  }

  const feesActive = isFeeCollectionActive(feeConfig)
  const buyRate = formatFeeBps(feeConfig.buyFeeBps)
  const sellRate = formatFeeBps(feeConfig.sellFeeBps)

  return (
    <div
      className={`rounded-xl border border-portx-border bg-portx-surface space-y-2 ${
        compact ? 'p-3 text-xs' : 'p-4 text-sm'
      }`}
    >
      <p className="font-semibold">Protocol fees</p>
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-portx-muted">Buy fee</dt>
          <dd className="font-mono font-semibold">{buyRate}</dd>
        </div>
        <div>
          <dt className="text-portx-muted">Sell fee</dt>
          <dd className="font-mono font-semibold">{sellRate}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-portx-muted">Status</dt>
          <dd className={feesActive ? 'text-portx-warning font-medium' : 'text-portx-muted'}>
            {feesActive ? 'Fees apply to testnet trades' : 'Fees disabled on-chain'}
          </dd>
        </div>
      </dl>

      {estimatedFee && estimatedFee.amount > 0n ? (
        <div className="rounded-lg border border-portx-warning/30 bg-portx-warning/5 px-3 py-2">
          <p className="text-portx-muted text-xs mb-0.5">Est. protocol fee</p>
          <p className="font-mono font-semibold text-portx-warning">
            {estimatedFee.isBuy
              ? `${formatEther(estimatedFee.amount)} ETH`
              : `${formatUnits(estimatedFee.amount, estimatedFee.decimals)} ${estimatedFee.symbol}`}
            <span className="text-portx-muted font-sans font-normal text-xs ml-2">
              ({estimatedFee.rateLabel})
            </span>
          </p>
        </div>
      ) : feesActive ? (
        <p className="text-xs text-portx-muted">
          Buy {formatProtocolFeeBps(feeConfig.buyFeeBps)} · Sell{' '}
          {formatProtocolFeeBps(feeConfig.sellFeeBps)} when fees apply.
        </p>
      ) : null}

      {netOutputWei !== undefined && netOutputWei >= 0n && estimatedFee && !estimatedFee.isBuy ? (
        <div>
          <p className="text-portx-muted text-xs mb-0.5">Est. net USDC after fee</p>
          <p className="font-mono font-semibold text-portx-green">
            {formatUnits(netOutputWei, netOutputDecimals)} {netOutputSymbol}
          </p>
        </div>
      ) : null}

      {showRecipientInAdvanced &&
      feeConfig.feeRecipient &&
      feeConfig.feeRecipient !== '0x0000000000000000000000000000000000000000' ? (
        <AdvancedDisclosure title="Advanced fee details" className="border-0 bg-transparent">
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Fee recipient</dt>
              <dd className="font-mono text-right break-all">{feeConfig.feeRecipient}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Max fee cap</dt>
              <dd>{formatFeeBps(feeConfig.maxFeeBps)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Recipient (short)</dt>
              <dd className="font-mono">{truncateAddress(feeConfig.feeRecipient, 6)}</dd>
            </div>
          </dl>
        </AdvancedDisclosure>
      ) : null}
    </div>
  )
}
