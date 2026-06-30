import { useMemo } from 'react'
import type { Basket } from '@/types/basket'
import type { TestnetPortfolioBalancesResult } from '@/hooks/useTestnetPortfolioBalances'
import type { TestnetPortfolioPosition } from '@/services/testnetPortfolio'
import {
  computeTestnetRebalancePreview,
  resolveTestnetRebalanceTargetBasket,
  TESTNET_REBALANCE_PREVIEW_NOTE,
  type TestnetRebalanceAction,
  type TestnetRebalancePreviewResult,
} from '@/services/testnetRebalance'
import {
  computeTestnetRebalanceSimulation,
  TESTNET_REBALANCE_SIMULATION_WARNING,
  type TestnetRebalanceSimulationResult,
  type TestnetSimulatedRebalanceAction,
} from '@/services/testnetRebalanceSimulation'

interface TestnetRebalancePreviewProps {
  balances: TestnetPortfolioBalancesResult
  latestPosition: TestnetPortfolioPosition | null
  baskets: Basket[]
  compact?: boolean
}

function actionClassName(action: TestnetRebalanceAction): string {
  if (action === 'increase') return 'text-portx-green'
  if (action === 'decrease') return 'text-amber-400'
  return 'text-portx-muted'
}

function simulatedActionClassName(action: TestnetSimulatedRebalanceAction): string {
  if (action === 'buy') return 'text-portx-green'
  if (action === 'sell') return 'text-amber-400'
  return 'text-portx-muted'
}

function formatSummaryList(symbols: string[]): string {
  return symbols.length > 0 ? symbols.join(', ') : 'None'
}

export function TestnetRebalancePreview({
  balances,
  latestPosition,
  baskets,
  compact = false,
}: TestnetRebalancePreviewProps) {
  const preview = useMemo<TestnetRebalancePreviewResult>(() => {
    const targetBasket = resolveTestnetRebalanceTargetBasket(latestPosition, baskets)
    return computeTestnetRebalancePreview({
      valuedAssets: balances.valuation.valuedAssets,
      targetBasket,
    })
  }, [balances.valuation.valuedAssets, latestPosition, baskets])

  const simulation = useMemo<TestnetRebalanceSimulationResult>(
    () =>
      computeTestnetRebalanceSimulation({
        preview,
        totalPortfolioValueUsd: balances.valuation.totalEstimatedValueUsd,
      }),
    [preview, balances.valuation.totalEstimatedValueUsd],
  )

  if (balances.isLoading) {
    return (
      <div className="border-t border-portx-border pt-4">
        <p className="text-sm text-portx-muted">Loading rebalance preview…</p>
      </div>
    )
  }

  if (balances.error) {
    return null
  }

  return (
    <div className="border-t border-portx-border pt-4 space-y-4">
      <div>
        <h3 className="font-bold">Portfolio Rebalance Preview</h3>
        <p className="text-xs text-portx-muted mt-1">
          Compare current on-chain allocation vs target basket weights.
        </p>
        <p className="text-xs text-amber-400/90 mt-2">{TESTNET_REBALANCE_PREVIEW_NOTE}</p>
      </div>

      <p className="text-sm">
        <span className="text-portx-muted">Target basket: </span>
        <span className="font-medium">{preview.targetBasketName}</span>
        {preview.usesDefaultTarget ? (
          <span className="text-xs text-portx-muted"> · default Sepolia Multi-Token Beta weights</span>
        ) : null}
      </p>

      <div
        className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}
      >
        <SummaryStat
          label="Assets to increase"
          value={formatSummaryList(preview.assetsToIncrease)}
        />
        <SummaryStat
          label="Assets to decrease"
          value={formatSummaryList(preview.assetsToDecrease)}
        />
        <SummaryStat
          label="Largest adjustment"
          value={
            preview.largestAdjustment
              ? `${preview.largestAdjustment.symbol} (${preview.largestAdjustment.actionLabel})`
              : 'Already balanced'
          }
        />
      </div>

      <div className="md:hidden space-y-3">
        {preview.legs.map((leg) => (
          <div
            key={leg.symbol}
            className="rounded-xl border border-portx-border bg-portx-surface p-3 space-y-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{leg.symbol}</span>
              <span className={`text-xs font-semibold ${actionClassName(leg.action)}`}>
                {leg.actionLabel}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-portx-muted">Current</dt>
              <dd className="font-mono text-right">{leg.currentPercent}%</dd>
              <dt className="text-portx-muted">Target</dt>
              <dd className="font-mono text-right">{leg.targetPercent}%</dd>
              <dt className="text-portx-muted">Difference</dt>
              <dd className={`font-mono text-right ${actionClassName(leg.action)}`}>
                {leg.differencePercent > 0 ? '+' : ''}
                {leg.differencePercent}%
              </dd>
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-portx-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-portx-border bg-portx-surface text-left text-xs uppercase tracking-wide text-portx-muted">
              <th className="px-4 py-3 font-semibold">Token</th>
              <th className="px-4 py-3 font-semibold">Current %</th>
              <th className="px-4 py-3 font-semibold">Target %</th>
              <th className="px-4 py-3 font-semibold">Difference %</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {preview.legs.map((leg) => (
              <tr
                key={leg.symbol}
                className="border-b border-portx-border last:border-0 hover:bg-portx-surface/50"
              >
                <td className="px-4 py-3 font-semibold">{leg.symbol}</td>
                <td className="px-4 py-3 font-mono">{leg.currentPercent}%</td>
                <td className="px-4 py-3 font-mono">{leg.targetPercent}%</td>
                <td className={`px-4 py-3 font-mono ${actionClassName(leg.action)}`}>
                  {leg.differencePercent > 0 ? '+' : ''}
                  {leg.differencePercent}%
                </td>
                <td className={`px-4 py-3 font-medium ${actionClassName(leg.action)}`}>
                  {leg.actionLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-portx-border pt-4 space-y-4">
        <div>
          <h4 className="font-bold">Rebalance Execution Simulation</h4>
          <p className="text-xs text-portx-muted mt-1">
            Suggested moves derived from allocation differences and estimated testnet values.
          </p>
          <p className="text-xs text-amber-400/90 mt-2">{TESTNET_REBALANCE_SIMULATION_WARNING}</p>
        </div>

        <p
          className={`text-sm ${
            simulation.status === 'balanced' ? 'text-portx-green' : 'text-portx-muted'
          }`}
        >
          {simulation.statusMessage}
        </p>

        {simulation.status === 'rebalance_needed' ? (
          <div
            className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}
          >
            <SummaryStat label="Number of actions" value={String(simulation.actionCount)} />
            <SummaryStat
              label="Total value to rebalance"
              value={simulation.totalEstimatedValueToRebalanceDisplay}
              highlight
            />
            <SummaryStat
              label="Largest simulated move"
              value={
                simulation.largestMove
                  ? `${simulation.largestMove.symbol} (${simulation.largestMove.estimatedValueToMoveDisplay})`
                  : '—'
              }
            />
            <SummaryStat
              label="Rebalance status"
              value={simulation.status === 'rebalance_needed' ? 'Moves suggested' : 'Balanced'}
            />
          </div>
        ) : null}

        <div className="md:hidden space-y-3">
          {simulation.actions.map((action) => (
            <div
              key={`sim-${action.symbol}`}
              className="rounded-xl border border-portx-border bg-portx-surface p-3 space-y-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{action.symbol}</span>
                <span
                  className={`text-xs font-semibold ${simulatedActionClassName(action.simulatedAction)}`}
                >
                  {action.actionLabel}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-portx-muted">Current</dt>
                <dd className="font-mono text-right">{action.currentPercent}%</dd>
                <dt className="text-portx-muted">Target</dt>
                <dd className="font-mono text-right">{action.targetPercent}%</dd>
                <dt className="text-portx-muted">Difference</dt>
                <dd
                  className={`font-mono text-right ${simulatedActionClassName(action.simulatedAction)}`}
                >
                  {action.differencePercent > 0 ? '+' : ''}
                  {action.differencePercent}%
                </dd>
                <dt className="text-portx-muted">Est. value to move</dt>
                <dd className="font-mono text-right">{action.estimatedValueToMoveDisplay}</dd>
                <dt className="text-portx-muted">Direction</dt>
                <dd className="text-right">{action.directionLabel}</dd>
              </dl>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border border-portx-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-portx-border bg-portx-surface text-left text-xs uppercase tracking-wide text-portx-muted">
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Current %</th>
                <th className="px-4 py-3 font-semibold">Target %</th>
                <th className="px-4 py-3 font-semibold">Difference %</th>
                <th className="px-4 py-3 font-semibold">Est. value to move</th>
                <th className="px-4 py-3 font-semibold">Direction</th>
              </tr>
            </thead>
            <tbody>
              {simulation.actions.map((action) => (
                <tr
                  key={`sim-${action.symbol}`}
                  className="border-b border-portx-border last:border-0 hover:bg-portx-surface/50"
                >
                  <td className="px-4 py-3 font-semibold">{action.symbol}</td>
                  <td
                    className={`px-4 py-3 font-medium ${simulatedActionClassName(action.simulatedAction)}`}
                  >
                    {action.actionLabel}
                  </td>
                  <td className="px-4 py-3 font-mono">{action.currentPercent}%</td>
                  <td className="px-4 py-3 font-mono">{action.targetPercent}%</td>
                  <td
                    className={`px-4 py-3 font-mono ${simulatedActionClassName(action.simulatedAction)}`}
                  >
                    {action.differencePercent > 0 ? '+' : ''}
                    {action.differencePercent}%
                  </td>
                  <td className="px-4 py-3 font-mono">{action.estimatedValueToMoveDisplay}</td>
                  <td className="px-4 py-3 text-portx-muted">{action.directionLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-portx-border bg-portx-surface p-3">
      <p className="text-xs text-portx-muted mb-1">{label}</p>
      <p
        className={`font-mono font-semibold text-sm ${highlight ? 'text-portx-green' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}
