import { useCallback, useEffect, useState } from 'react'
import { RouteProviderBadge } from '@/components/RouteProviderBadge'
import type { QuoteProvider } from '@/types/route'
import { truncateAddress } from '@/utils/format'
import {
  clearTestnetSwapHistory,
  loadTestnetSwapHistory,
  shouldShowRecentTestSwaps,
  TESTNET_SWAP_HISTORY_UPDATED_EVENT,
  type TestnetSwapHistoryRecord,
} from '@/services/testnetSwapHistory'

interface RecentTestSwapsProps {
  className?: string
  compact?: boolean
}

function formatSwapTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isQuoteProvider(value: string): value is QuoteProvider {
  return ['0x', '1inch', 'uniswap', 'uniswap-sepolia', 'unsupported'].includes(value)
}

export function RecentTestSwaps({ className = '', compact = false }: RecentTestSwapsProps) {
  const [records, setRecords] = useState<TestnetSwapHistoryRecord[]>(() => loadTestnetSwapHistory())

  const refresh = useCallback(() => {
    setRecords(loadTestnetSwapHistory())
  }, [])

  useEffect(() => {
    refresh()
    const handleUpdate = () => refresh()
    window.addEventListener(TESTNET_SWAP_HISTORY_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(TESTNET_SWAP_HISTORY_UPDATED_EVENT, handleUpdate)
  }, [refresh])

  if (!shouldShowRecentTestSwaps()) {
    return null
  }

  const handleClear = () => {
    if (!records.length) return
    const confirmed = window.confirm('Clear all recent Sepolia test swap history from this browser?')
    if (!confirmed) return
    clearTestnetSwapHistory()
  }

  return (
    <div className={`card space-y-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Recent Test Swaps</h2>
          <p className="text-xs text-portx-muted mt-1">
            Local browser history only — last {records.length || 0} Sepolia test swap(s).
          </p>
        </div>
        {records.length > 0 ? (
          <button type="button" onClick={handleClear} className="btn-secondary text-sm py-2 px-3">
            Clear history
          </button>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-portx-muted">
          No test swaps saved yet. Successful Sepolia basket swaps from Review &amp; Execute will
          appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li
              key={record.txHash}
              className="rounded-xl border border-portx-border bg-portx-surface p-3 sm:p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{record.basketLabel}</p>
                  <p className="text-xs text-portx-muted truncate">{record.routeLabel}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isQuoteProvider(record.provider) ? (
                    <RouteProviderBadge provider={record.provider} size="sm" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-portx-muted">
                      {record.provider}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      record.status === 'success' ? 'text-portx-green' : 'text-portx-danger'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>

              <div
                className={`grid gap-2 text-xs ${
                  compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                <p>
                  <span className="text-portx-muted">Out: </span>
                  <span className="font-mono text-portx-green">{record.outputAmount}</span>
                </p>
                {!compact ? (
                  <p>
                    <span className="text-portx-muted">In: </span>
                    <span className="font-mono">{record.inputAmount}</span>
                  </p>
                ) : null}
                <p>
                  <span className="text-portx-muted">Tx: </span>
                  <span className="font-mono">{truncateAddress(record.txHash, 6)}</span>
                </p>
                <p>
                  <span className="text-portx-muted">Time: </span>
                  <span>{formatSwapTime(record.timestamp)}</span>
                </p>
              </div>

              <a
                href={record.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-portx-green underline"
              >
                View on Sepolia Etherscan
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
