import { useEffect, useMemo, useRef, useState } from 'react'
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
import { getBundleExecutorChainId, getBundleExecutorAddress } from '@/services/bundleExecutorContract'
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
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { shouldSuppressMainnetPilotPanel } from '@/utils/testnetQuoteRouting'
import {
  getTestnetUniswapExecuteAmountLabel,
  getTestnetUniswapBuyExecuteLabel,
  getTestnetUniswapSellExecuteLabel,
  useTestnetUniswapBasketExecute,
} from '@/hooks/useTestnetUniswapBasketExecute'
import { approvalStatusLabel, type TestnetApprovalRequirement } from '@/hooks/useTestnetBundleExecutorApprovals'
import { useTestnetPortfolioBalances } from '@/hooks/useTestnetPortfolioBalances'
import { TESTNET_DASHBOARD_REFRESH_EVENT } from '@/hooks/useTestnetDashboardPortfolio'
import { useMainnetSwapExecute } from '@/hooks/useMainnetSwapExecute'
import { saveTestnetPortfolioFromPlan } from '@/services/testnetPortfolio'
import { saveTestnetSwapFromPlan } from '@/services/testnetSwapHistory'
import {
  formatTestnetLegOutput,
  formatTestnetLegRouteLabel,
  formatTestnetLegInputDisplay,
  formatTestnetPlanTotalInput,
  formatTestnetPlanTotalOutput,
  isSepoliaTestnetTradePlan,
} from '@/utils/testnetPreview'
import { useBundleExecutorFeeConfig } from '@/hooks/useBundleExecutorFeeConfig'
import {
  estimateBuyProtocolFee,
  estimateSellProtocolFee,
  formatProtocolFeeBps,
  isFeeCollectionActive,
} from '@/services/protocolFee'
import { RouteProviderBadge } from './RouteProviderBadge'
import { ExecutionWarning } from './ExecutionWarning'
import { QuoteQualityPanel } from './QuoteQualityPanel'
import { MainnetPilotReadinessPanel } from './MainnetPilotReadinessPanel'
import { assessQuoteQualityFromPlan, isLegUnsupported } from '@/utils/quoteQuality'
import { AdvancedDisclosure } from '@/components/ui/AdvancedDisclosure'
import { TestnetProtocolFeeSummary } from '@/components/TestnetProtocolFeeSummary'
import {
  EXECUTION_ROUTER_NAME,
  EXECUTE_PORTFOLIO_TRADE,
  formatDisabledReason,
  formatSafetyGateLabel,
  SEPOLIA_PORTFOLIO_TRADE,
  TESTNET_BUTTONS,
  TESTNET_SUCCESS,
  ASSET_NOT_ROUTEABLE,
  TESTNET_TRADE_NOTE,
} from '@/config/testnetUxCopy'

type ReviewQuoteSource = 'api' | 'fallback' | 'testnet' | null

interface TransactionReviewModalProps {
  plan: ExecutionPlan | null
  quoteSource?: ReviewQuoteSource
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming?: boolean
  onTestnetExecutionSuccess?: (plan: ExecutionPlan) => void
}

function getSepoliaReviewWarnings(warnings: string[]): string[] {
  const filtered = warnings.filter(
    (w) =>
      !/not for production/i.test(w) &&
      !/^Sepolia testnet Uniswap V3/i.test(w) &&
      !/^Demo mode/i.test(w),
  )
  return [TESTNET_TRADE_NOTE, ...filtered]
}

function getPlanTypeLabel(plan: ExecutionPlan, testnetPlan?: boolean): string {
  if (testnetPlan) {
    if (plan.type === 'buy') return TESTNET_BUTTONS.reviewTrade
    if (plan.type === 'sell_basket') return TESTNET_BUTTONS.reviewSell
    return 'Review Sell All'
  }
  if (plan.type === 'buy') return 'Buy Basket'
  if (plan.type === 'sell_basket') return 'Sell Basket'
  return 'Sell All Portfolio'
}

function getAlphaExecutionDisabledLabel(plan: ExecutionPlan): string {
  if (plan.type === 'buy') return 'Buy execution disabled in Alpha'
  if (plan.type === 'sell_basket' || plan.type === 'sell_all') {
    return 'Sell execution disabled in Alpha'
  }
  return 'Execution disabled in Alpha'
}

function ApprovalRow({
  leg,
  onApprove,
  isApproving,
  pendingSymbol,
  compact = false,
}: {
  leg: TestnetApprovalRequirement
  onApprove: () => void
  isApproving: boolean
  pendingSymbol: string | null
  compact?: boolean
}) {
  const statusTone =
    leg.status === 'approved'
      ? 'text-portx-green'
      : leg.status === 'pending'
        ? 'text-portx-muted'
        : 'text-portx-warning'

  return (
    <li
      className={`rounded-lg border border-portx-border bg-black/20 px-3 py-2 text-xs ${
        compact ? 'border-transparent bg-transparent px-0 py-0' : 'space-y-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {leg.kind === 'protocol_fee' ? 'USDC fee' : `${leg.symbol} → USDC`}
          <span className={`ml-2 font-normal ${statusTone}`}>
            {approvalStatusLabel(leg.status)}
          </span>
        </p>
        {!leg.sufficient && leg.status !== 'pending' ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={isApproving}
            className="btn-secondary text-xs px-3 py-1 disabled:opacity-50"
          >
            {leg.kind === 'protocol_fee' ? 'Approve USDC Fee' : `Approve ${leg.symbol}`}
          </button>
        ) : leg.status === 'pending' || pendingSymbol === leg.symbol ? (
          <span className="text-xs text-portx-muted">Approving…</span>
        ) : null}
      </div>
      {!compact && leg.kind === 'input' ? (
        <p>
          <span className="text-portx-muted">Amount: </span>
          <span className="font-mono">
            {leg.amountDisplay} {leg.symbol}
          </span>
        </p>
      ) : null}
    </li>
  )
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
  quoteSource = null,
  open,
  onClose,
  onConfirm,
  confirming,
  onTestnetExecutionSuccess,
}: TransactionReviewModalProps) {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { enableLiveExecution } = useFeatureFlags()
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [simulating, setSimulating] = useState(false)
  const testnetExecute = useTestnetUniswapBasketExecute(plan, open, quoteSource ?? null)
  const testnetBalances = useTestnetPortfolioBalances()
  const feeConfigState = useBundleExecutorFeeConfig()
  const mainnetPilot = useMainnetSwapExecute(plan, open, quoteSource ?? null)
  const isProductionPreview = !ENABLE_TESTNET_MODE
  const isSepoliaTestnetTrade = isSepoliaTestnetTradePlan(plan, quoteSource ?? null)
  const suppressMainnetPilot = shouldSuppressMainnetPilotPanel({
    quoteSource,
    chainId,
    plan,
  })
  const showTestnetExecute =
    isSepoliaTestnetTrade && ENABLE_TESTNET_MODE && enableLiveExecution
  const showMainnetPilotExecute =
    mainnetPilot.showPilotUi && !showTestnetExecute && !suppressMainnetPilot
  const showMainnetPilotPanel =
    mainnetPilot.showPilotPanel && !showTestnetExecute && !suppressMainnetPilot
  const savedHistoryTxRef = useRef<string | null>(null)

  const walletConnected = isConnected && Boolean(address)

  useEffect(() => {
    if (!open) {
      savedHistoryTxRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (
      !open ||
      !plan ||
      !testnetExecute.isTestnetUniswapPlan ||
      testnetExecute.status !== 'success' ||
      !testnetExecute.txHash ||
      !testnetExecute.explorerUrl
    ) {
      return
    }

    if (savedHistoryTxRef.current === testnetExecute.txHash) {
      return
    }

    savedHistoryTxRef.current = testnetExecute.txHash
    const saveParams = {
      txHash: testnetExecute.txHash,
      explorerUrl: testnetExecute.explorerUrl,
      chainId: plan.chainId,
      status: 'success' as const,
    }
    saveTestnetSwapFromPlan(plan, saveParams)
    saveTestnetPortfolioFromPlan(plan, saveParams)
    testnetBalances.refresh()
    window.dispatchEvent(new Event(TESTNET_DASHBOARD_REFRESH_EVENT))
    onTestnetExecutionSuccess?.(plan)
  }, [
    open,
    plan,
    testnetExecute.isTestnetUniswapPlan,
    testnetExecute.status,
    testnetExecute.txHash,
    testnetExecute.explorerUrl,
    onTestnetExecutionSuccess,
  ])

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
    return buildSwapCalls(bundleQuotePreview, address)
  }, [bundleQuotePreview, address])

  const sepoliaChainId = getBundleExecutorChainId()
  const walletOnSepolia = chainId === sepoliaChainId
  const isSellPlan = plan?.type === 'sell_basket' || plan?.type === 'sell_all'
  const soldAssetSymbols =
    plan && isSellPlan
      ? plan.legs.map((leg) => leg.quote.inputToken.symbol).join(', ')
      : null

  const estimatedProtocolFee = useMemo(() => {
    if (!plan || !feeConfigState.config || !isFeeCollectionActive(feeConfigState.config)) {
      return null
    }

    if (testnetExecute.isSellPlan) {
      const totalOutputWei = plan.legs.reduce(
        (sum, leg) => sum + BigInt(leg.quote.outputAmount),
        0n,
      )
      const feeAmount = estimateSellProtocolFee(totalOutputWei, feeConfigState.config)
      const outputToken = plan.legs[0]?.quote.outputToken
      if (feeAmount <= 0n || !outputToken) return null
      return {
        amount: feeAmount,
        symbol: outputToken.symbol,
        decimals: outputToken.decimals,
        isBuy: false,
        rateLabel: formatProtocolFeeBps(feeConfigState.config.sellFeeBps),
      }
    }

    if (bundlePrepareResult?.status === 'ready') {
      const feeAmount = estimateBuyProtocolFee(
        bundlePrepareResult.totalNativeEthWei,
        feeConfigState.config,
      )
      if (feeAmount <= 0n) return null
      return {
        amount: feeAmount,
        symbol: 'ETH',
        decimals: 18,
        isBuy: true,
        rateLabel: formatProtocolFeeBps(feeConfigState.config.buyFeeBps),
      }
    }

    return null
  }, [plan, feeConfigState.config, testnetExecute.isSellPlan, bundlePrepareResult])

  if (!open || !plan) return null
  const quoteQuality = assessQuoteQualityFromPlan(plan, quoteSource ?? null)
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

  const showLivePrep =
    !plan.isDemo &&
    readiness.hasZeroExRoute &&
    !isSepoliaTestnetTrade &&
    !suppressMainnetPilot
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
        <div className="flex items-start justify-between mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">
              {isSepoliaTestnetTrade ? getPlanTypeLabel(plan, true) : 'Review Transaction'}
            </h2>
            <p className="text-sm text-portx-muted mt-0.5">
              {isSepoliaTestnetTrade ? SEPOLIA_PORTFOLIO_TRADE : getPlanTypeLabel(plan)}
            </p>
            <div className="mt-3">
              <QuoteQualityPanel
                quality={quoteQuality}
                showLegCounts
                showProceedsDetail={isSellPlan}
                totalOutputUsd={plan.totalOutputUsd}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-portx-muted hover:text-white text-2xl leading-none shrink-0"
            aria-label="Close"
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
                Signable quote metadata (0x)
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
                  <ul className="space-y-1 font-mono text-portx-muted">
                    <ChecklistRow
                      label="Calldata present"
                      passed={leg.hasExecutableCalldata}
                      detail={
                        leg.hasExecutableCalldata
                          ? `${leg.calldataDisplay} (${leg.calldata.length} chars)`
                          : leg.calldataStatus === 'demo'
                            ? 'Demo placeholder'
                            : leg.calldataStatus === 'unsupported'
                              ? 'Unsupported on Ethereum'
                              : 'Missing'
                      }
                    />
                    <ChecklistRow
                      label="Exact sell amount"
                      passed={leg.hasExactSellAmount}
                      detail={
                        leg.hasExactSellAmount && leg.sellAmount
                          ? `${leg.sellAmount} base units`
                          : 'USD estimate only'
                      }
                    />
                    <ChecklistRow
                      label="Approval required"
                      passed={!leg.requiresApproval}
                      detail={
                        leg.requiresApproval
                          ? `Yes — approve spender ${leg.spenderDisplay}`
                          : 'No (native ETH or N/A)'
                      }
                    />
                  </ul>
                  <div className="grid grid-cols-1 gap-1 font-mono text-portx-muted pt-1 border-t border-portx-border">
                    <p>
                      <span className="text-portx-muted/80">transaction.to: </span>
                      <span className="text-white">{leg.transactionToDisplay}</span>
                    </p>
                    {leg.spender && (
                      <p>
                        <span className="text-portx-muted/80">spender: </span>
                        <span className="text-white">{leg.spenderDisplay}</span>
                      </p>
                    )}
                    {leg.transactionValue && leg.transactionValue !== '0' && (
                      <p>
                        <span className="text-portx-muted/80">transaction.value: </span>
                        <span className="text-white">{leg.transactionValue} wei</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-portx-warning font-medium">
                Execution disabled in Alpha — quote data is prepared for review only.
              </p>
            </div>
          </div>
        )}

        {ENABLE_TESTNET_MODE && !plan.isDemo && bundleQuotePreview && (
          <AdvancedDisclosure title="Advanced — trade payload & routing" className="mb-6">
            {!walletOnSepolia && (
              <div className="rounded-xl border border-portx-warning/50 bg-portx-warning/10 text-portx-warning p-3 text-sm">
                Sepolia required for testnet portfolio trades.
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
                  <div className="col-span-2">
                    <dt className="text-portx-muted text-xs">{EXECUTION_ROUTER_NAME}</dt>
                    <dd className="font-mono text-xs break-all">{getBundleExecutorAddress()}</dd>
                  </div>
                </dl>

                {bundleBuildResult.swapCalls.map((swapCall, index) => {
                  const legQuote = plan.legs[index]?.quote
                  const builtCalldata = swapCall.data
                  const calldataStatus = legQuote
                    ? getCalldataStatus(legQuote, plan.isDemo)
                    : 'missing'
                  const calldataLabel =
                    calldataStatus === 'available'
                      ? `Built (${builtCalldata.length} chars)`
                      : calldataStatus === 'demo'
                        ? 'Preview placeholder'
                        : calldataStatus === 'unsupported'
                          ? ASSET_NOT_ROUTEABLE
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
                        <span className="text-portx-muted">calldata: </span>
                        <span
                          className={
                            calldataStatus === 'available' ? 'text-portx-green' : 'text-portx-warning'
                          }
                        >
                          {calldataLabel}
                        </span>
                      </p>
                      {builtCalldata.startsWith('0x') && builtCalldata.length > 10 && (
                        <p>
                          <span className="text-portx-muted">calldata hex: </span>
                          {truncateCalldata(builtCalldata, 24)}
                        </p>
                      )}
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
              {isSepoliaTestnetTrade
                ? `${EXECUTE_PORTFOLIO_TRADE} — execute below when checks pass.`
                : 'Payload preview only — no wallet writes.'}
            </p>
          </AdvancedDisclosure>
        )}

        {isSepoliaTestnetTrade && (
          <div className="mb-6 p-4 rounded-xl bg-portx-surface border border-portx-green/30 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-portx-green">
              {SEPOLIA_PORTFOLIO_TRADE}
            </p>

            <ExecutionWarning
              variant="testnet"
              warnings={
                testnetExecute.isSellPlan
                  ? [
                      TESTNET_TRADE_NOTE,
                      'Sells your Sepolia portfolio tokens to USDC in one transaction.',
                      `Approve tokens for ${EXECUTION_ROUTER_NAME} if prompted.`,
                    ]
                  : [
                      TESTNET_TRADE_NOTE,
                      `Buys your portfolio allocation with ${getTestnetUniswapExecuteAmountLabel()} on Sepolia.`,
                    ]
              }
            />

            <div className="rounded-xl border border-portx-border bg-black/20 p-3 space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                Multi-leg basket breakdown
              </p>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-portx-muted">Leg count</dt>
                  <dd className="font-mono font-semibold">{plan.legs.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-portx-muted">
                    {testnetExecute.isSellPlan ? 'Tokens sold' : 'Total amountIn'}
                  </dt>
                  <dd className="font-mono font-semibold text-portx-green">
                    {formatTestnetPlanTotalInput(plan)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-portx-muted mb-1">
                    {testnetExecute.isSellPlan ? 'Est. total USDC received' : 'Est. total output'}
                  </dt>
                  <dd className="font-mono font-semibold">{formatTestnetPlanTotalOutput(plan)}</dd>
                </div>
                {estimatedProtocolFee ? (
                  <div className="col-span-2">
                    <TestnetProtocolFeeSummary
                      feeConfig={feeConfigState.config}
                      isAvailable={feeConfigState.isAvailable}
                      estimatedFee={estimatedProtocolFee}
                      netOutputWei={
                        testnetExecute.isSellPlan
                          ? plan.legs.reduce(
                              (sum, leg) => sum + BigInt(leg.quote.outputAmount),
                              0n,
                            ) - estimatedProtocolFee.amount
                          : undefined
                      }
                      compact
                    />
                  </div>
                ) : feeConfigState.isAvailable && feeConfigState.config?.feesEnabled ? (
                  <div className="col-span-2">
                    <TestnetProtocolFeeSummary
                      feeConfig={feeConfigState.config}
                      isAvailable={feeConfigState.isAvailable}
                      compact
                    />
                  </div>
                ) : null}
              </dl>
              <ul className="space-y-2">
                {plan.legs.map((leg, index) => {
                  const quotePreviewLeg = bundleQuotePreview?.legs[index]
                  const weight = quotePreviewLeg?.allocation.weightPercent ?? 0
                  return (
                    <li
                      key={leg.index}
                      className="rounded-lg border border-portx-border bg-portx-surface px-3 py-2 text-xs space-y-1"
                    >
                      <p className="font-medium">
                        Leg {index + 1}: {formatTestnetLegRouteLabel(leg)}
                        {weight > 0 ? ` (${weight}%)` : ''}
                      </p>
                      <p>
                        <span className="text-portx-muted">amountIn: </span>
                        <span className="font-mono">{formatTestnetLegInputDisplay(leg)}</span>
                      </p>
                      <p>
                        <span className="text-portx-muted">est. out: </span>
                        <span className="font-mono text-portx-green">
                          {formatTestnetLegOutput(
                            leg.quote.outputAmount,
                            leg.quote.outputToken.decimals,
                            leg.quote.outputToken.symbol,
                          )}
                        </span>
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>

            {testnetExecute.approvals.requiresApprovals ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                  Sell approvals — complete in order
                </p>

                {testnetExecute.isSellPlan && testnetExecute.sellPayloadRefreshing ? (
                  <p className="text-xs text-portx-muted">
                    Refreshing sell quote before execution…
                  </p>
                ) : null}

                {testnetExecute.isSellPlan ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-portx-accent hover:underline disabled:opacity-50 disabled:no-underline"
                    disabled={testnetExecute.sellPayloadRefreshing}
                    onClick={() => testnetExecute.refreshSellQuote()}
                  >
                    Refresh quote
                  </button>
                ) : null}

                <div className="rounded-lg border border-portx-border bg-black/20 p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">1. Approve portfolio tokens</p>
                      <p className="text-xs text-portx-muted">
                        LINK, UNI, WETH, AAVE → {EXECUTION_ROUTER_NAME}
                      </p>
                    </div>
                    {testnetExecute.approvals.portfolioApprovalsSufficient ? (
                      <span className="text-xs font-semibold text-portx-green shrink-0">Approved</span>
                    ) : testnetExecute.approvals.missingInputApprovals.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          void testnetExecute.approvals.approveMissingPortfolioTokens()
                        }
                        disabled={testnetExecute.approvals.isApproving}
                        className="btn-secondary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
                      >
                        {testnetExecute.approvals.isApproving
                          ? 'Approving…'
                          : 'Approve Required Tokens'}
                      </button>
                    ) : null}
                  </div>
                  <ul className="space-y-2">
                    {testnetExecute.approvals.inputLegs.map((leg) => (
                      <ApprovalRow
                        key={leg.id}
                        leg={leg}
                        onApprove={() => void testnetExecute.approvals.approveToken(leg.id)}
                        isApproving={testnetExecute.approvals.isApproving}
                        pendingSymbol={testnetExecute.approvals.pendingSymbol}
                      />
                    ))}
                  </ul>
                </div>

                {testnetExecute.approvals.protocolFeeLeg ? (
                  <div className="rounded-lg border border-portx-warning/30 bg-portx-warning/5 p-3 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">2. Approve USDC fee</p>
                        <p className="text-xs text-portx-muted">
                          Protocol sell fee — est.{' '}
                          {testnetExecute.approvals.protocolFeeLeg.amountDisplay} USDC
                        </p>
                      </div>
                      {testnetExecute.approvals.protocolFeeLeg.sufficient ? (
                        <span className="text-xs font-semibold text-portx-green shrink-0">
                          Approved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void testnetExecute.approvals.approveToken(
                              testnetExecute.approvals.protocolFeeLeg!.id,
                            )
                          }
                          disabled={testnetExecute.approvals.isApproving}
                          className="btn-secondary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
                        >
                          Approve USDC Fee
                        </button>
                      )}
                    </div>
                    <ApprovalRow
                      leg={testnetExecute.approvals.protocolFeeLeg}
                      onApprove={() =>
                        void testnetExecute.approvals.approveToken(
                          testnetExecute.approvals.protocolFeeLeg!.id,
                        )
                      }
                      isApproving={testnetExecute.approvals.isApproving}
                      pendingSymbol={testnetExecute.approvals.pendingSymbol}
                      compact
                    />
                  </div>
                ) : (
                  <p className="text-xs text-portx-muted">
                    2. USDC protocol fee — not required (fees disabled on Sepolia executor).
                  </p>
                )}

                <p className="text-xs text-portx-muted">
                  3. Execute Sell — enabled after approvals and a fresh simulation pass.
                </p>

                {testnetExecute.approvals.approvalError ? (
                  <p className="text-xs text-portx-danger">{testnetExecute.approvals.approvalError}</p>
                ) : null}
                {testnetExecute.approvals.allApprovalsSufficient ? (
                  <p className="text-xs text-portx-green">
                    All approvals complete — ready to execute when simulation passes.
                  </p>
                ) : null}
              </div>
            ) : null}

            <AdvancedDisclosure title="Advanced — execution checks">
              <ul className="space-y-2">
                {testnetExecute.gates.map((gate) => (
                  <ChecklistRow
                    key={gate.id}
                    label={formatSafetyGateLabel(gate.label)}
                    passed={gate.passed}
                    detail={gate.detail}
                  />
                ))}
              </ul>
              {testnetExecute.disabledReason && !testnetExecute.canExecute ? (
                <p className="text-xs text-portx-muted mt-2">
                  Disabled: {formatDisabledReason(testnetExecute.disabledReason)}
                </p>
              ) : null}
            </AdvancedDisclosure>

            {testnetExecute.status === 'pending' ? (
              <div className="rounded-xl border border-portx-border bg-portx-surface p-3 text-sm">
                Waiting for wallet signature or Sepolia confirmation…
              </div>
            ) : null}

            {testnetExecute.status === 'success' ? (
              <div className="rounded-xl border-2 border-portx-green/50 bg-portx-green/15 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-portx-green mb-1">
                    Swap confirmed
                  </p>
                  <p className="font-bold text-lg text-portx-green">
                    {testnetExecute.isSellPlan ? TESTNET_SUCCESS.sell : TESTNET_SUCCESS.buy}
                  </p>
                  <p className="text-sm text-portx-muted mt-1">
                    Your transaction was confirmed on Sepolia. Review the hash below or open
                    Etherscan for full details.
                  </p>
                  <p className="text-sm mt-2">
                    <span className="text-portx-muted">Total output: </span>
                    <span className="font-mono font-semibold text-portx-green">
                      {formatTestnetPlanTotalOutput(plan)}
                    </span>
                  </p>
                </div>
                {plan.legs.length > 1 ? (
                  <ul className="space-y-2 text-xs">
                    {plan.legs.map((leg, index) => (
                      <li
                        key={leg.index}
                        className="rounded-lg border border-portx-green/20 bg-black/20 px-3 py-2"
                      >
                        Leg {index + 1}: {formatTestnetLegRouteLabel(leg)} est. out:{' '}
                        <span className="font-mono text-portx-green">
                          {formatTestnetLegOutput(
                            leg.quote.outputAmount,
                            leg.quote.outputToken.decimals,
                            leg.quote.outputToken.symbol,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {testnetExecute.txHash ? (
                  <div className="rounded-lg border border-portx-green/30 bg-black/20 p-3 text-sm space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
                      Transaction hash
                    </p>
                    <p className="font-mono text-xs break-all text-white">{testnetExecute.txHash}</p>
                    {testnetExecute.explorerUrl ? (
                      <a
                        href={testnetExecute.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-portx-green font-medium underline"
                      >
                        View on Sepolia Etherscan
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {testnetExecute.errorMessage && testnetExecute.status !== 'success' ? (
              <div className="rounded-xl border border-portx-danger/40 bg-portx-danger/10 text-portx-danger p-3 text-sm">
                {testnetExecute.errorMessage}
              </div>
            ) : null}

            {testnetExecute.txHash && testnetExecute.status !== 'success' ? (
              <div className="text-sm space-y-1">
                <p className="text-portx-muted">Transaction hash</p>
                <p className="font-mono text-xs break-all">{testnetExecute.txHash}</p>
                {testnetExecute.explorerUrl ? (
                  <a
                    href={testnetExecute.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-portx-green text-sm underline"
                  >
                    View on Sepolia Etherscan
                  </a>
                ) : null}
              </div>
            ) : null}

            {testnetExecute.status === 'error' ? (
              <button
                type="button"
                onClick={testnetExecute.reset}
                className="btn-secondary w-full text-sm"
              >
                Reset
              </button>
            ) : null}
          </div>
        )}

        {isSellPlan && soldAssetSymbols && (
          <div className="mb-6 p-4 rounded-xl bg-portx-surface border border-portx-border text-sm space-y-2">
            <p>
              <span className="text-portx-muted">Assets sold: </span>
              <span className="font-mono font-semibold">{soldAssetSymbols}</span>
            </p>
            <p>
              <span className="text-portx-muted">Est. proceeds: </span>
              <span className="font-mono font-semibold text-portx-green">
                {formatUsd(plan.totalOutputUsd)} USDC
              </span>
            </p>
            {quoteQuality.proceedsExcludeUnsupported && (
              <p className="text-xs text-portx-warning">
                Proceeds exclude {formatUsd(quoteQuality.excludedProceedsUsd)} from{' '}
                {quoteQuality.unsupportedLegCount}{' '}
                {ENABLE_TESTNET_MODE ? ASSET_NOT_ROUTEABLE.toLowerCase() : 'unsupported leg(s)'}.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {plan.legs.map((leg) => {
            const q = leg.quote
            const legQuote = {
              allocation: {
                token: q.inputToken,
                weightPercent: 0,
                inputAmountUsd: q.inputAmountUsd,
                inputAmount: q.inputAmount,
              },
              bestQuote: q,
              allQuotes: [q],
            }
            const unsupported = isLegUnsupported(legQuote)
            const showTestnetLegAmounts = isSepoliaTestnetTrade
            return (
              <div
                key={leg.index}
                className={`p-3 rounded-xl bg-portx-surface border text-sm ${
                  unsupported
                    ? 'border-portx-warning/40 bg-portx-warning/5'
                    : 'border-portx-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {showTestnetLegAmounts
                      ? formatTestnetLegRouteLabel(leg)
                      : `${q.inputToken.symbol} → ${q.outputToken.symbol}`}
                  </span>
                  <RouteProviderBadge provider={q.provider} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-portx-muted font-mono">
                  <span>
                    In:{' '}
                    {showTestnetLegAmounts
                      ? formatTestnetLegInputDisplay(leg)
                      : formatUsd(q.inputAmountUsd)}
                  </span>
                  <span>
                    Out:{' '}
                    {showTestnetLegAmounts
                      ? formatTestnetLegOutput(
                          q.outputAmount,
                          q.outputToken.decimals,
                          q.outputToken.symbol,
                        )
                      : `~${formatTokenAmount(parseFloat(q.outputAmount))} ${q.outputToken.symbol}`}
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
            <dt className="text-portx-muted text-xs">
              {isSellPlan ? 'Est. proceeds (USDC)' : 'Est. total out'}
            </dt>
            <dd className="font-mono font-bold text-portx-green">
              {isSepoliaTestnetTrade
                ? formatTestnetPlanTotalOutput(plan)
                : formatUsd(plan.totalOutputUsd)}
            </dd>
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
          variant={
            isSepoliaTestnetTrade ? 'testnet' : plan.isDemo ? 'demo' : showMainnetPilotPanel ? 'warning' : 'info'
          }
          warnings={
            plan.isDemo && !isSepoliaTestnetTrade
              ? [
                  'Demo mode. Real swap execution is not live yet.',
                  ...plan.warnings.filter((w) => !w.includes('Demo mode')),
                ]
              : isSepoliaTestnetTrade
                ? getSepoliaReviewWarnings(plan.warnings)
                : showMainnetPilotPanel
                  ? [
                      'Mainnet pilot — single-leg buy only. Multi-leg and sell execution remain disabled.',
                      ...plan.warnings,
                    ]
                  : [
                      'Live execution coming soon — transaction calldata is shown for review only.',
                      ...plan.warnings,
                    ]
          }
        />

        {showMainnetPilotPanel && (
          <MainnetPilotReadinessPanel pilot={mainnetPilot} legCount={plan.legs.length} />
        )}

        <div className="flex gap-3 mt-6">
          {isSepoliaTestnetTrade && testnetExecute.status === 'success' ? (
            <>
              <button
                type="button"
                onClick={testnetExecute.reset}
                className="btn-secondary flex-1"
              >
                Reset
              </button>
              <button type="button" onClick={onClose} className="btn-primary flex-1">
                Done
              </button>
            </>
          ) : showMainnetPilotExecute && mainnetPilot.status === 'success' ? (
            <>
              <button
                type="button"
                onClick={mainnetPilot.reset}
                className="btn-secondary flex-1"
              >
                Reset
              </button>
              <button type="button" onClick={onClose} className="btn-primary flex-1">
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              {showTestnetExecute ? (
                <button
                  type="button"
                  onClick={() => void testnetExecute.execute()}
                  disabled={!testnetExecute.canExecute}
                  title={testnetExecute.disabledReason ?? undefined}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testnetExecute.status === 'pending'
                    ? testnetExecute.isSellPlan
                      ? TESTNET_BUTTONS.executingTestnetSell
                      : TESTNET_BUTTONS.executingTestnetTrade
                    : testnetExecute.isSellPlan
                      ? getTestnetUniswapSellExecuteLabel()
                      : getTestnetUniswapBuyExecuteLabel()}
                </button>
              ) : isSepoliaTestnetTrade ? (
                <button
                  type="button"
                  disabled
                  title={
                    testnetExecute.disabledReason ??
                    'Complete Sepolia testnet checks to enable execution.'
                  }
                  className="btn-primary flex-1 opacity-50 cursor-not-allowed"
                >
                  {testnetExecute.isSellPlan
                    ? TESTNET_BUTTONS.executeTestnetSell
                    : TESTNET_BUTTONS.executeTestnetTrade}
                </button>
              ) : plan.isDemo && !isProductionPreview ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={confirming}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {confirming
                    ? 'Processing...'
                    : ENABLE_TESTNET_MODE
                      ? TESTNET_BUTTONS.confirmDemoExecution
                      : 'Confirm Demo Execution'}
                </button>
              ) : showMainnetPilotExecute ? (
                <button
                  type="button"
                  onClick={() => void mainnetPilot.execute()}
                  disabled={!mainnetPilot.canExecuteSwap}
                  title={
                    mainnetPilot.approvalRequired
                      ? 'Missing approval'
                      : (mainnetPilot.disabledReason ?? undefined)
                  }
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mainnetPilot.status === 'pending'
                    ? 'Executing Mainnet Pilot…'
                    : 'Execute Mainnet Pilot'}
                </button>
              ) : plan.type === 'buy' && !showTestnetExecute ? (
                <button
                  type="button"
                  disabled
                  title={
                    mainnetPilot.failingChecks[0]?.detail ??
                    mainnetPilot.disabledReason ??
                    getAlphaExecutionDisabledLabel(plan)
                  }
                  className="btn-primary flex-1 opacity-50 cursor-not-allowed"
                >
                  {getAlphaExecutionDisabledLabel(plan)}
                </button>
              ) : plan.type === 'sell_basket' && !showTestnetExecute ? (
                <button
                  type="button"
                  disabled
                  title={getAlphaExecutionDisabledLabel(plan)}
                  className="btn-primary flex-1 opacity-50 cursor-not-allowed"
                >
                  {getAlphaExecutionDisabledLabel(plan)}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title={getAlphaExecutionDisabledLabel(plan)}
                  className="btn-primary flex-1 opacity-50 cursor-not-allowed"
                >
                  {getAlphaExecutionDisabledLabel(plan)}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
