import { truncateAddress } from '@/utils/format'
import type { TestnetPortfolioBalancesResult } from '@/hooks/useTestnetPortfolioBalances'

interface TestnetPortfolioAssetTableProps {
  balances: TestnetPortfolioBalancesResult
}

export function TestnetPortfolioAssetTable({ balances }: TestnetPortfolioAssetTableProps) {
  return (
    <div className="border-t border-portx-border pt-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Testnet Portfolio Assets</h3>
          <p className="text-xs text-portx-muted mt-1">
            Read-only ERC-20 balances held by BundleExecutor on Sepolia.
          </p>
        </div>
        <button
          type="button"
          onClick={balances.refresh}
          disabled={balances.isFetching}
          className="btn-secondary text-sm py-2 px-3"
        >
          {balances.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-portx-muted">
        <span>
          Total assets: <span className="font-mono text-portx-foreground">{balances.assetCount}</span>
        </span>
        {balances.lastRefreshedAt ? (
          <span>
            Last refreshed:{' '}
            <span className="font-mono">
              {new Date(balances.lastRefreshedAt).toLocaleString()}
            </span>
          </span>
        ) : null}
      </div>

      {balances.isLoading ? (
        <p className="text-sm text-portx-muted">Loading portfolio assets…</p>
      ) : balances.error ? (
        <p className="text-sm text-red-400">
          Failed to load portfolio assets: {balances.error.message}
        </p>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {balances.assets.map((asset) => (
              <div
                key={asset.symbol}
                className="rounded-xl border border-portx-border bg-portx-surface p-3 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{asset.symbol}</span>
                  <span className="font-mono text-portx-green">
                    {asset.balanceDisplay} {asset.symbol}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-portx-muted">Address</dt>
                  <dd className="font-mono text-right">{truncateAddress(asset.tokenAddress, 4)}</dd>
                  <dt className="text-portx-muted">Decimals</dt>
                  <dd className="font-mono text-right">{asset.decimals}</dd>
                  <dt className="text-portx-muted">Source</dt>
                  <dd className="text-right">{asset.source}</dd>
                </dl>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border border-portx-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-portx-border bg-portx-surface text-left text-xs uppercase tracking-wide text-portx-muted">
                  <th className="px-4 py-3 font-semibold">Token</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Decimals</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {balances.assets.map((asset) => (
                  <tr
                    key={asset.symbol}
                    className="border-b border-portx-border last:border-0 hover:bg-portx-surface/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{asset.symbol}</div>
                      <div className="text-xs text-portx-muted font-mono mt-0.5">
                        {truncateAddress(asset.tokenAddress, 6)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className="text-portx-green">{asset.balanceDisplay}</span>{' '}
                      <span className="text-portx-muted">{asset.symbol}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{asset.decimals}</td>
                    <td className="px-4 py-3 text-portx-muted">{asset.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
