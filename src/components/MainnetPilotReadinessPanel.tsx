import { useCallback, useState } from 'react'
import type { UseMainnetSwapExecuteResult } from '@/hooks/useMainnetSwapExecute'
import {
  formatQuoteSourceLabel,
  formatWalletChainLabel,
  getMainnetPilotBlockerMessages,
} from '@/utils/mainnetPilotReadiness'
import { copyTextToClipboard } from '@/utils/clipboard'
import { truncateExecutionAddress } from '@/utils/executionMetadata'
import { ENABLE_MAINNET_EXECUTION } from '@/config/features'

interface MainnetPilotReadinessPanelProps {
  pilot: UseMainnetSwapExecuteResult
  legCount: number
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
            : 'bg-portx-danger/10 text-portx-danger border border-portx-danger/30'
        }`}
        aria-hidden
      >
        {passed ? '✓' : '×'}
      </span>
      <div className="min-w-0">
        <p className={passed ? 'text-white' : 'text-portx-warning'}>{label}</p>
        {detail && <p className="text-xs text-portx-muted font-mono break-all">{detail}</p>}
      </div>
    </li>
  )
}

function CopyableAddressRow({ label, address }: { label: string; address: string | null }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!address) return
    const ok = await copyTextToClipboard(address)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }, [address])

  if (!address) return null

  return (
    <div className="flex items-center justify-between gap-2 text-xs font-mono">
      <div className="min-w-0">
        <span className="text-portx-muted">{label}: </span>
        <span className="text-white break-all">{address}</span>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="shrink-0 px-2 py-1 rounded border border-portx-border text-portx-muted hover:text-white hover:border-portx-green/40 text-[10px] uppercase tracking-wide"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function ContextStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="p-2 rounded-lg bg-black/20 border border-portx-border">
      <p className="text-[10px] uppercase tracking-wide text-portx-muted">{label}</p>
      <p className={`text-xs font-mono mt-0.5 ${warn ? 'text-portx-warning' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

export function MainnetPilotReadinessPanel({ pilot, legCount }: MainnetPilotReadinessPanelProps) {
  const blockerMessages = getMainnetPilotBlockerMessages(pilot.failingChecks, {
    approvalRequired: pilot.approvalRequired,
    legCount,
  })

  const approvalStatusLabel = !pilot.requiresApproval
    ? 'Not required (native ETH or N/A)'
    : pilot.approvalRequired
      ? 'Missing approval'
      : pilot.allowanceSufficient
        ? 'Allowance sufficient'
        : pilot.isEligible
          ? 'Checking allowance…'
          : 'Pending readiness checks'

  const walletWarn =
    pilot.walletConnected && pilot.walletChainId !== 1
      ? true
      : !pilot.walletConnected
        ? true
        : false

  return (
    <div className="mt-4 p-4 rounded-xl border border-portx-border bg-portx-surface space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
            Mainnet buy pilot — execution readiness
          </p>
          <p className="text-sm mt-1">
            {pilot.isEligible && pilot.canExecuteSwap ? (
              <span className="text-portx-green font-semibold">Ready to execute</span>
            ) : pilot.isEligible ? (
              <span className="text-portx-warning font-semibold">Eligible — complete approval to execute</span>
            ) : (
              <span className="text-portx-muted font-semibold">Execution disabled — checks incomplete</span>
            )}
          </p>
        </div>
        <span
          className={`text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full border ${
            pilot.isEligible
              ? 'border-portx-green/40 text-portx-green bg-portx-green/10'
              : 'border-portx-warning/40 text-portx-warning bg-portx-warning/10'
          }`}
        >
          {pilot.passingChecks.length}/{pilot.checks.length} passed
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ContextStat
          label="Quote source"
          value={formatQuoteSourceLabel(pilot.quoteSource)}
          warn={pilot.quoteSource !== 'api'}
        />
        <ContextStat
          label="Wallet chain"
          value={formatWalletChainLabel(pilot.walletChainId, pilot.walletConnected)}
          warn={walletWarn}
        />
        <ContextStat
          label="Pilot flag"
          value={ENABLE_MAINNET_EXECUTION ? 'Enabled' : 'Disabled'}
          warn={!ENABLE_MAINNET_EXECUTION}
        />
        <ContextStat
          label="Approval"
          value={approvalStatusLabel}
          warn={pilot.approvalRequired}
        />
      </div>

      {blockerMessages.length > 0 && (
        <div className="rounded-xl border border-portx-warning/40 bg-portx-warning/10 p-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-warning">
            Blockers
          </p>
          <ul className="text-sm text-portx-muted space-y-1 list-disc list-inside">
            {blockerMessages.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {pilot.failingChecks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-warning">
            Failing gates ({pilot.failingChecks.length})
          </p>
          <ul className="space-y-1">
            {pilot.failingChecks.map((check) => (
              <ChecklistRow
                key={check.id}
                label={check.label}
                passed={false}
                detail={check.detail}
              />
            ))}
          </ul>
        </div>
      )}

      {pilot.passingChecks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-green">
            Passing gates ({pilot.passingChecks.length})
          </p>
          <ul className="space-y-1">
            {pilot.passingChecks.map((check) => (
              <ChecklistRow
                key={check.id}
                label={check.label}
                passed
                detail={check.detail}
              />
            ))}
          </ul>
        </div>
      )}

      {(pilot.tokenInAddress || pilot.tokenOutAddress || pilot.spenderAddress || pilot.transactionTo) && (
        <div className="space-y-2 pt-1 border-t border-portx-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-portx-muted">
            Contract addresses
          </p>
          <CopyableAddressRow
            label={`Token in${pilot.tokenSymbol ? ` (${pilot.tokenSymbol})` : ''}`}
            address={pilot.tokenInAddress}
          />
          <CopyableAddressRow label="Token out" address={pilot.tokenOutAddress} />
          <CopyableAddressRow label="Spender (AllowanceHolder)" address={pilot.spenderAddress} />
          <CopyableAddressRow label="transaction.to" address={pilot.transactionTo} />
        </div>
      )}

      {pilot.requiresApproval && pilot.approvalRequired && pilot.isEligible && (
        <div className="rounded-xl border border-portx-warning/40 bg-portx-warning/10 p-3 space-y-2">
          <p className="text-sm font-semibold text-portx-warning">Approval required</p>
          <p className="text-xs text-portx-muted">
            Approve {pilot.tokenSymbol} for AllowanceHolder{' '}
            {pilot.spenderAddress ? truncateExecutionAddress(pilot.spenderAddress) : 'unknown'} before
            executing. Approval is not sent automatically.
          </p>
          <button
            type="button"
            onClick={() => void pilot.approve()}
            disabled={pilot.isBusy}
            className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {pilot.status === 'approving' ? 'Approving…' : `Approve ${pilot.tokenSymbol}`}
          </button>
          {pilot.approvalExplorerUrl && (
            <a
              href={pilot.approvalExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-portx-green text-xs underline block"
            >
              View approval on Etherscan
            </a>
          )}
        </div>
      )}

      {pilot.requiresApproval && pilot.allowanceSufficient && pilot.isEligible && (
        <p className="text-xs text-portx-green">Token allowance sufficient for this swap.</p>
      )}

      {pilot.simulationMessage && pilot.status !== 'idle' && (
        <p
          className={`text-xs ${
            pilot.simulationPassed ? 'text-portx-green' : 'text-portx-warning'
          }`}
        >
          {pilot.simulationMessage}
        </p>
      )}

      {pilot.errorMessage && (
        <p className="text-xs text-portx-danger">{pilot.errorMessage}</p>
      )}

      {pilot.explorerUrl && (
        <a
          href={pilot.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-portx-green text-sm underline"
        >
          View swap on Etherscan
        </a>
      )}
    </div>
  )
}
