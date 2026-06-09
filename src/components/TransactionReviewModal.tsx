import { useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { ExecutionPlan } from '@/types/execution'
import { BUNDLE_EXECUTOR_SEPOLIA } from '@/config/contracts'
import { formatUsd, formatTokenAmount, truncateAddress } from '@/utils/format'
import { formatSlippage } from '@/utils/slippage'
import { ZERO_ADDRESS } from '@/utils/addresses'
import {
  assessExecutionReadiness,
  getCalldataStatus,
  truncateCalldata,
} from '@/services/transactionBuilder'
import { assessExecutionSafety } from '@/services/executionSafety'
import { getBundleExecutorChainId } from '@/services/bundleExecutorContract'
import {
  buildSwapCalls,
  executionPlanToQuotePreview,
  prepareBundleExecution,
} from '@/services/bundleExecutorWrite'
import {
  prepareExecution,
  simulateExecution,
  type SimulationResult,
} from '@/services/executionService'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { RouteProviderBadge } from './RouteProviderBadge'
import { ExecutionWarning } from './ExecutionWarning'

interface TransactionReviewModalProps {
  plan: ExecutionPlan | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
}

function ChecklistRow({
  label,
  passed,
  detail,
}: {
  label: string
  passed: boolean
  detail?: string
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
          passed
            ? 'bg-portx-green/20 text-portx-green border border-portx-green/40'
            : 'bg-portx-surface text-portx-muted border border-portx-border'
        }`}
        aria-hidden
      >
        {passed ? '✓' : '○'}
      </span>
      <div className="min-w-0">
        <p className={passed ? 'text-white' : 'text-portx-muted'}>{label}</p>
        {detail && <p className="text-xs text-portx-muted font-mono truncate">{detail}</p>}
      </div>
    </li>
  )
}

export function TransactionReviewModal({
  plan,
  open,
  onClose,
  onConfirm,
  confirming,
}: TransactionReviewModalProps) {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { enableLiveExecution } = useFeatureFlags()
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [simulating, setSimulating] = useState(false)

  const walletConnected = isConnected && Boolean(address)

  const prepared = useMemo(
    () => (plan && open ? prepareExecution(plan) : null),
    [plan, open]
  )

  const bundleQuotePreview = useMemo(
    () => (plan && open && !plan.isDemo ? executionPlanToQuotePreview(plan) : null),
    [plan, open]
  )

  const bundlePrepareResult = useMemo(() => {
    if (!bundleQuotePreview) return null
    return prepareBundleExecution({
      walletConnected,
      chainId,
      walletAddress: address,
      quotePreview: bundleQuotePreview,
    })
  }, [bundleQuotePreview, walletConnected, chainId, address])

  const bundleBuildResult = useMemo(() => {
    if (!bundleQuotePreview) return null
    return buildSwapCalls(bundleQuotePreview)
  }, [bundleQuotePreview])

  const sepoliaChainId = getBundleExecutorChainId()
  const walletOnSepolia = chainId === sepoliaChainId

  if (!open || !plan) return null
  const readiness =
    plan.readiness ??
    assessExecutionReadiness(plan, {
      walletConnected,
      currentChainId: chainId,
    })

  const safety = assessExecutionSafety(plan, {
    walletConnected,
    currentChainId: chainId,
    featureFlagEnabled: enableLiveExecution,
  })

  const showLivePrep = !plan.isDemo && readiness.hasZeroExRoute
  const statusTone =
    readiness.status === 'ready_for_wallet'
      ? 'border-portx-green/40 bg-portx-green/10 text-portx-green'
      : 'border-portx-warning/40 bg-portx-warning/10 text-portx-warning'

  const simulationTone =
    simulation?.passed === true
      ? 'border-portx-green/40 bg-portx-green/10 text-portx-green'
      : simulation?.passed === false
        ? 'border-portx-danger/40 bg-portx-danger/10 text-portx-danger'
        : 'border-portx-border bg-portx-surface text-portx-muted'

  const handleSimulate = async () => {
    if (!prepared) return
    setSimulating(true)
    try {
      const result = await simulateExecution(prepared, { currentChainId: chainId })
      setSimulation(result)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-glow border-portx-green/20 shadow-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Review Transaction</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-portx-muted hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-portx-muted mb-4">
          Non-custodial — you sign all swaps from your connected wallet. PortX never holds funds or
          private keys.
        </p>

        {showLivePrep && (
          <div className="mb-6 space-y-4">
            <div className="p-4 rounded-xl bg-portx-surface border border-portx-border space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                Execution safety
              </p>
              {safety.readyExceptFeatureFlag ? (
                <>
                  <p className="font-bold text-portx-green">Ready for execution</p>
                  <p className="text-sm text-portx-muted">Feature flag disabled</p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-portx-muted">Execution Status</p>
                  <p className="font-bold text-portx-warning">{safety.executionLabel}</p>
                  <p className="text-sm">
                    <span className="text-portx-muted">Reason: </span>
                    <span className="font-medium">{safety.blockedReason}</span>
                  </p>
                </>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <p className="text-xs text-portx-muted">Readiness</p>
                  <p className="font-mono font-bold">{safety.readinessScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-portx-muted">Execution</p>
                  <p className="font-mono font-bold text-portx-warning">{safety.executionLabel}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${statusTone}`}>
              <p className="text-xs uppercase tracking-wide font-semibold mb-1">
                Live quote execution plan
              </p>
              <p className="font-bold">{readiness.statusLabel}</p>
              <p className="text-xs mt-1 opacity-90">
                {readiness.status === 'ready_for_wallet'
                  ? '0x calldata is prepared for wallet signing when live execution ships.'
                  : 'Quote is for preview — calldata or router data is not fully available.'}
              </p>
            </div>

            <ExecutionWarning
              variant="info"
              warnings={['Live execution coming soon — swaps are not sent on-chain in v1 preview.']}
            />

            {prepared && (
              <div className="p-4 rounded-xl bg-portx-surface border border-portx-border space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                  Transaction simulation
                </p>

                <div className={`rounded-xl border p-3 ${simulationTone}`}>
                  <p className="text-xs uppercase tracking-wide opacity-80 mb-1">Simulation Status</p>
                  <p className="font-bold">
                    {simulation ? simulation.label : 'Not simulated'}
                  </p>
                  {simulation && (
                    <p className="text-xs mt-1 opacity-90">{simulation.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {prepared.legs.map((leg) => (
                    <div
                      key={leg.legIndex}
                      className="p-3 rounded-xl bg-black/20 border border-portx-border text-xs space-y-2 font-mono"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium font-sans">
                          Leg {leg.legIndex + 1}: {leg.inputSymbol} → {leg.outputSymbol}
                        </span>
                        <RouteProviderBadge provider={leg.provider} />
                      </div>
                      <p>
                        <span className="text-portx-muted">chainId: </span>
                        {leg.chainId}
                      </p>
                      <p>
                        <span className="text-portx-muted">router: </span>
                        {leg.routerDisplay}
                      </p>
                      <p>
                        <span className="text-portx-muted">target: </span>
                        {leg.targetAddress}
                      </p>
                      <p>
                        <span className="text-portx-muted">calldata size: </span>
                        {leg.calldataSize} chars
                      </p>
                      <p>
                        <span className="text-portx-muted">estimated gas: </span>
                        {leg.estimatedGasUnits.toLocaleString()} units (
                        {formatUsd(leg.estimatedGasUsd)})
                      </p>
                      <p>
                        <span className="text-portx-muted">provider: </span>
                        {leg.provider}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void handleSimulate()}
                  disabled={simulating}
                  className="btn-secondary w-full py-3 disabled:opacity-50"
                >
                  {simulating ? 'Simulating...' : 'Simulate Transaction'}
                </button>
              </div>
            )}

            <div className="p-4 rounded-xl bg-portx-surface border border-portx-border space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                Safety checks
              </p>
              <ul className="space-y-2">
                {safety.checks.map((check) => (
                  <ChecklistRow
                    key={check.id}
                    label={check.label}
                    passed={check.passed}
                    detail={check.detail}
                  />
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-portx-surface border border-portx-border space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                Execution readiness
              </p>
              <ul className="space-y-2">
                {readiness.checks.map((check) => (
                  <ChecklistRow
                    key={check.id}
                    label={check.label}
                    passed={check.passed}
                    detail={check.detail}
                  />
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                0x route & calldata
              </p>
              {readiness.legs.map((leg) => (
                <div
                  key={leg.index}
                  className="p-3 rounded-xl bg-portx-surface border border-portx-border text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      Leg {leg.index + 1}: {leg.inputSymbol} → {leg.outputSymbol}
                    </span>
                    <RouteProviderBadge provider={leg.provider} />
                  </div>
                  <div className="grid grid-cols-1 gap-1 font-mono text-portx-muted">
                    <p>
                      <span className="text-portx-muted/80">Router: </span>
                      <span className="text-white">{leg.routerDisplay}</span>
                    </p>
                    <p>
                      <span className="text-portx-muted/80">Calldata: </span>
                      <span
                        className={
                          leg.calldataStatus === 'available' ? 'text-portx-green' : 'text-portx-warning'
                        }
                      >
                        {leg.calldataStatus === 'available'
                          ? `${leg.calldataDisplay} (${leg.calldata.length} chars)`
                          : leg.calldataStatus === 'demo'
                            ? 'Demo placeholder'
                            : leg.calldataStatus === 'unsupported'
                              ? 'Unsupported on Ethereum'
                              : 'Missing'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!plan.isDemo && bundleQuotePreview && (
          <div className="mb-6 p-4 rounded-xl bg-portx-surface border border-portx-border space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
              BundleExecutor Testnet Payload Preview
            </p>

            {!walletOnSepolia && (
              <div className="rounded-xl border border-portx-warning/50 bg-portx-warning/10 text-portx-warning p-3 text-sm">
                Sepolia required for BundleExecutor testnet execution.
              </div>
            )}

            {bundlePrepareResult?.status === 'validation_errors' && (
              <div className="rounded-xl border border-portx-danger/40 bg-portx-danger/5 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-portx-danger">
                  Validation errors
                </p>
                <ul className="space-y-1 text-xs text-portx-muted">
                  {bundlePrepareResult.errors.map((error) => (
                    <li key={`${error.code}-${error.field ?? error.message}`}>
                      <span className="font-mono text-portx-danger">{error.code}</span>
                      {' — '}
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bundleBuildResult?.status === 'ready' ? (
              <div className="space-y-3">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-portx-muted text-xs">basketId</dt>
                    <dd className="font-mono text-xs break-all">{bundleBuildResult.basketId}</dd>
                  </div>
                  <div>
                    <dt className="text-portx-muted text-xs">Swap calls</dt>
                    <dd className="font-mono">{bundleBuildResult.legCount}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-portx-muted text-xs">Chain target</dt>
                    <dd>
                      {BUNDLE_EXECUTOR_SEPOLIA.networkLabel} ({bundleBuildResult.chainId})
                    </dd>
                  </div>
                </dl>

                {bundleBuildResult.swapCalls.map((swapCall, index) => {
                  const legQuote = plan.legs[index]?.quote
                  const calldataStatus = legQuote
                    ? getCalldataStatus(legQuote, plan.isDemo)
                    : 'missing'
                  const calldataLabel =
                    calldataStatus === 'available'
                      ? `Available (${legQuote?.calldata.length ?? 0} chars)`
                      : calldataStatus === 'demo'
                        ? 'Demo placeholder'
                        : calldataStatus === 'unsupported'
                          ? 'Unsupported'
                          : 'Missing'

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-black/20 border border-portx-border text-xs space-y-2 font-mono"
                    >
                      <p className="font-sans font-medium text-sm text-white">
                        Leg {index + 1}
                        {legQuote
                          ? `: ${legQuote.inputToken.symbol} → ${legQuote.outputToken.symbol}`
                          : ''}
                      </p>
                      <p>
                        <span className="text-portx-muted">router: </span>
                        {truncateAddress(swapCall.router, 6)}
                      </p>
                      <p>
                        <span className="text-portx-muted">tokenIn: </span>
                        {swapCall.tokenIn === ZERO_ADDRESS
                          ? 'ETH (native)'
                          : truncateAddress(swapCall.tokenIn, 6)}
                      </p>
                      <p>
                        <span className="text-portx-muted">tokenOut: </span>
                        {truncateAddress(swapCall.tokenOut, 6)}
                      </p>
                      <p>
                        <span className="text-portx-muted">amountIn: </span>
                        {swapCall.amountIn.toString()}
                      </p>
                      <p>
                        <span className="text-portx-muted">minAmountOut: </span>
                        {swapCall.minAmountOut.toString()}
                      </p>
                      <p>
                        <span className="text-portx-muted">calldata status: </span>
                        <span
                          className={
                            calldataStatus === 'available' ? 'text-portx-green' : 'text-portx-warning'
                          }
                        >
                          {calldataLabel}
                        </span>
                      </p>
                      {legQuote?.calldata?.startsWith('0x') && (
                        <p>
                          <span className="text-portx-muted">calldata: </span>
                          {truncateCalldata(legQuote.calldata, 24)}
                        </p>
                      )}
                      <p>
                        <span className="text-portx-muted">chain target: </span>
                        {BUNDLE_EXECUTOR_SEPOLIA.networkLabel} ({sepoliaChainId})
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : bundleBuildResult?.status === 'validation_errors' ? (
              <div className="rounded-xl border border-portx-warning/40 bg-portx-warning/10 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-portx-warning">
                  SwapCall build errors
                </p>
                <ul className="space-y-1 text-xs text-portx-muted">
                  {bundleBuildResult.errors.map((error) => (
                    <li key={`build-${error.code}-${error.field ?? error.message}`}>
                      <span className="font-mono text-portx-warning">{error.code}</span>
                      {' — '}
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-xs text-portx-muted">
              Payload preview only — no wallet writes or contract calls.
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {plan.legs.map((leg) => {
            const q = leg.quote
            return (
              <div
                key={leg.index}
                className="p-3 rounded-xl bg-portx-surface border border-portx-border text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {q.inputToken.symbol} → {q.outputToken.symbol}
                  </span>
                  <RouteProviderBadge provider={q.provider} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-portx-muted font-mono">
                  <span>In: {formatUsd(q.inputAmountUsd)}</span>
                  <span>
                    Out: ~{formatTokenAmount(parseFloat(q.outputAmount))} {q.outputToken.symbol}
                  </span>
                  <span>Gas: {formatUsd(q.estimatedGasUsd)}</span>
                  <span>Impact: {q.priceImpactPercent.toFixed(2)}%</span>
                </div>
                <p className="text-[10px] text-portx-muted mt-2 truncate">
                  Route: {q.routeSummary.join(' → ')}
                </p>
              </div>
            )
          })}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm mb-6 p-4 rounded-xl bg-portx-surface border border-portx-border">
          <div>
            <dt className="text-portx-muted text-xs">Est. total out</dt>
            <dd className="font-mono font-bold text-portx-green">{formatUsd(plan.totalOutputUsd)}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs">Est. total gas</dt>
            <dd className="font-mono">{formatUsd(plan.totalGasUsd)}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs">Slippage</dt>
            <dd className="font-mono">{formatSlippage(plan.slippageBps)}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs">Swaps</dt>
            <dd className="font-mono">{plan.legs.length}</dd>
          </div>
        </dl>

        <ExecutionWarning
          warnings={
            plan.isDemo
              ? [
                  'Demo mode. Real swap execution is not live yet.',
                  ...plan.warnings.filter((w) => !w.includes('Demo mode')),
                ]
              : [
                  'Live execution coming soon — transaction calldata is shown for review only.',
                  ...plan.warnings,
                ]
          }
        />

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          {plan.isDemo ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {confirming ? 'Processing...' : 'Confirm Demo Execution'}
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Execution disabled in Alpha"
              className="btn-primary flex-1 opacity-50 cursor-not-allowed"
            >
              Execution disabled in Alpha
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
