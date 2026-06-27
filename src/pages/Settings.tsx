import { useEffect, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_STABLECOIN,
  ENABLE_DEMO_QUOTES,
  PORTX_API_URL,
  SLIPPAGE_OPTIONS,
  STABLECOIN_OPTIONS,
  type StablecoinOption,
} from '@/config/constants'
import { APP_MODE, APP_MODE_BADGE_LABEL, APP_MODE_BANNER_MESSAGE } from '@/config/appMode'
import { getActiveNetworkConfig } from '@/config/networks'
import { BUNDLE_EXECUTOR_SEPOLIA } from '@/config/contracts'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE, SHOW_ALPHA_WARNINGS } from '@/config/features'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { AppModeBadge } from '@/components/AppModeIndicator'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { truncateAddress, formatUsd } from '@/utils/format'
import {
  getExpectedBundleExecutorNetworkLabel,
  useBundleExecutorHealth,
} from '@/hooks/useBundleExecutorHealth'
import {
  formatFeeBps,
  useBundleExecutorFeeConfig,
} from '@/hooks/useBundleExecutorFeeConfig'
import { useBundleExecutorExecutionReadiness } from '@/hooks/useBundleExecutorExecutionReadiness'
import {
  MOCK_ETH_TEST_AMOUNT,
  useMockExecuteBasket,
} from '@/hooks/useMockExecuteBasket'
import { usePortfolio } from '@/hooks/usePortfolio'
import { RecentTestSwaps } from '@/components/RecentTestSwaps'
import { TestnetPortfolioSummary } from '@/components/TestnetPortfolioSummary'
import { formatEther } from 'viem'

const SETTINGS_KEY = 'portx-settings'

interface AppSettings {
  slippageBps: number
  preferredStablecoin: StablecoinOption
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw) as AppSettings
  } catch {
    /* ignore */
  }
  return { slippageBps: DEFAULT_SLIPPAGE_BPS, preferredStablecoin: DEFAULT_STABLECOIN as StablecoinOption }
}

export function Settings() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const portfolio = usePortfolio()
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const targetNetwork = getActiveNetworkConfig()
  const contractHealth = useBundleExecutorHealth()
  const feeConfig = useBundleExecutorFeeConfig()
  const executionReadiness = useBundleExecutorExecutionReadiness()
  const mockExecute = useMockExecuteBasket()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="section-title mb-0">Settings</h1>
        <AppModeBadge />
      </div>

      {SHOW_ALPHA_WARNINGS ? (
        <StatusBanner
          variant={ENABLE_TESTNET_MODE ? 'warning' : 'info'}
          className="mb-6"
          compact
        >
          {APP_MODE_BANNER_MESSAGE}
        </StatusBanner>
      ) : null}

      <div className="card mb-6 space-y-4">
        <h2 className="font-bold">App mode</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-portx-muted">Mode</dt>
            <dd className="font-medium text-right">{APP_MODE_BADGE_LABEL}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-portx-muted">Live execution</dt>
            <dd>{ENABLE_LIVE_EXECUTION ? 'Enabled (env)' : 'Disabled'}</dd>
          </div>
          {ENABLE_TESTNET_MODE ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">VITE_APP_MODE</dt>
                <dd className="font-mono text-xs">{APP_MODE}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Target network (scaffold)</dt>
                <dd className="text-right">{targetNetwork.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Chain ID (scaffold)</dt>
                <dd className="font-mono">{targetNetwork.chainId}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>

      <div className="card mb-6 space-y-4">
        <h2 className="font-bold">Wallet & Network</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-portx-muted">Status</dt>
            <dd>{isConnected ? 'Connected' : 'Disconnected'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-portx-muted">Address</dt>
            <dd className="font-mono">{address ? truncateAddress(address, 6) : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-portx-muted">Network</dt>
            <dd>{chain?.name ?? `Chain ${chainId}`}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-portx-muted">Demo portfolio</dt>
            <dd className="text-portx-green">{formatUsd(portfolio.totalValueUsd)}</dd>
          </div>
        </dl>
      </div>

      <div className="card mb-6 space-y-6">
        <h2 className="font-bold">Trading preferences</h2>

        <div>
          <label className="label">Slippage tolerance</label>
          <div className="flex flex-wrap gap-2">
            {SLIPPAGE_OPTIONS.map((bps) => (
              <button
                key={bps}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, slippageBps: bps }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  settings.slippageBps === bps
                    ? 'border-portx-green bg-portx-green/10 text-portx-green'
                    : 'border-portx-border hover:border-portx-green/30'
                }`}
              >
                {(bps / 100).toFixed(2)}%
              </button>
            ))}
          </div>
          <p className="text-xs text-portx-muted mt-2">
            Used by DEX router when fetching 0x / 1inch / Uniswap quotes.
          </p>
        </div>

        <div>
          <label className="label">Preferred stablecoin</label>
          <select
            value={settings.preferredStablecoin}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                preferredStablecoin: e.target.value as StablecoinOption,
              }))
            }
            className="input-field"
          >
            {STABLECOIN_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-portx-muted mt-2">
            Default input token for basket buys (live integration).
          </p>
        </div>

        <button type="button" onClick={handleSave} className="btn-primary w-full">
          {saved ? 'Saved ✓' : 'Save Settings'}
        </button>
      </div>

      {!ENABLE_TESTNET_MODE ? (
        <div className="card mb-6 space-y-4">
          <h2 className="font-bold">API &amp; quotes</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Quote source</dt>
              <dd className="text-right">
                {ENABLE_DEMO_QUOTES ? 'Demo quotes (local fallback)' : 'PortX backend API'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Backend URL</dt>
              <dd className="font-mono text-xs text-right break-all">{PORTX_API_URL}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-portx-muted">Live execution</dt>
              <dd className="text-right">{ENABLE_LIVE_EXECUTION ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
          <p className="text-xs text-portx-muted">
            {ENABLE_DEMO_QUOTES
              ? 'Quotes use local demo providers when the backend is unavailable. Set VITE_ENABLE_DEMO_QUOTES=false to prefer the Railway API.'
              : 'Quotes are fetched from the PortX backend. DEX API keys stay server-side.'}
          </p>
        </div>
      ) : null}

      {ENABLE_TESTNET_MODE ? (
        <>
          <div className="card mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">BundleExecutor (Sepolia)</h2>
              <span className="text-xs font-mono text-portx-muted">Read-only</span>
            </div>
            <p className="text-xs text-portx-muted">
              Verified testnet deployment — status display only. No wallet writes or{' '}
              <code className="text-[11px]">executeBasket()</code> calls from PortX Alpha.
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Contract</dt>
                <dd className="font-medium text-right">{BUNDLE_EXECUTOR_SEPOLIA.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Address</dt>
                <dd className="font-mono text-xs text-right break-all">
                  {BUNDLE_EXECUTOR_SEPOLIA.address}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Network</dt>
                <dd className="text-right">{BUNDLE_EXECUTOR_SEPOLIA.networkLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Verification</dt>
                <dd className="text-portx-green text-right">
                  {BUNDLE_EXECUTOR_SEPOLIA.verified ? 'Verified' : 'Unverified'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Live execution</dt>
                <dd className="text-right">{ENABLE_LIVE_EXECUTION ? 'Enabled' : 'Disabled'}</dd>
              </div>
            </dl>
            <a
              href={BUNDLE_EXECUTOR_SEPOLIA.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full text-center text-sm py-2.5"
            >
              View on Sepolia Etherscan
            </a>
          </div>

          <div className="card mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Contract Health</h2>
              <span className="text-xs font-mono text-portx-muted">Read-only</span>
            </div>
            {contractHealth.statusMessage ? (
              <StatusBanner
                variant={contractHealth.status === 'disconnected' ? 'info' : 'warning'}
                compact
              >
                {contractHealth.statusMessage}
                {contractHealth.status === 'wrong-network' && (
                  <span className="block mt-1 text-xs opacity-90">
                    Switch wallet to {getExpectedBundleExecutorNetworkLabel()} to probe the contract.
                  </span>
                )}
              </StatusBanner>
            ) : null}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Connected Network</dt>
                <dd className="text-right">{contractHealth.connectedNetwork}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Contract Address</dt>
                <dd className="font-mono text-xs text-right break-all">
                  {contractHealth.contractAddress}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Owner Address</dt>
                <dd className="font-mono text-xs text-right break-all">
                  {contractHealth.isLoading
                    ? 'Checking…'
                    : contractHealth.ownerAddress
                      ? truncateAddress(contractHealth.ownerAddress, 6)
                      : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-portx-muted">Contract Reachable</dt>
                <dd
                  className={`text-right ${
                    contractHealth.contractReachable === true
                      ? 'text-portx-green'
                      : contractHealth.contractReachable === false
                        ? 'text-portx-danger'
                        : ''
                  }`}
                >
                  {contractHealth.isLoading
                    ? 'Checking…'
                    : contractHealth.contractReachable === true
                      ? 'Yes'
                      : contractHealth.contractReachable === false
                        ? 'No'
                        : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Protocol Fee Config</h2>
              <span className="text-xs font-mono text-portx-muted">Read-only</span>
            </div>
            <p className="text-xs text-portx-muted">
              On-chain fee settings from BundleExecutor. No fees are collected yet — display only.
            </p>
            {feeConfig.isLoading ? (
              <p className="text-sm text-portx-muted">Loading fee config…</p>
            ) : !feeConfig.isAvailable ? (
              <StatusBanner variant="info" compact>
                Fee config unavailable on the deployed contract — redeploy BundleExecutor with C-2
                changes to read settings here.
              </StatusBanner>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-portx-muted">Fee recipient</dt>
                  <dd className="font-mono text-xs text-right break-all">
                    {feeConfig.config?.feeRecipient && feeConfig.config.feeRecipient !== '0x0000000000000000000000000000000000000000'
                      ? truncateAddress(feeConfig.config.feeRecipient, 6)
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-portx-muted">Buy fee</dt>
                  <dd className="text-right">
                    {feeConfig.config ? formatFeeBps(feeConfig.config.buyFeeBps) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-portx-muted">Sell fee</dt>
                  <dd className="text-right">
                    {feeConfig.config ? formatFeeBps(feeConfig.config.sellFeeBps) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-portx-muted">Max fee cap</dt>
                  <dd className="text-right">
                    {feeConfig.config ? formatFeeBps(feeConfig.config.maxFeeBps) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-portx-muted">Fees enabled</dt>
                  <dd
                    className={`text-right ${
                      feeConfig.config?.feesEnabled ? 'text-portx-warning' : 'text-portx-muted'
                    }`}
                  >
                    {feeConfig.config?.feesEnabled ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {mockExecute.isSectionVisible ? (
            <div className="card mb-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">Sepolia Mock Execute Test</h2>
                <span className="text-xs font-mono text-portx-warning">Testnet only</span>
              </div>
              <StatusBanner variant="warning" compact>
                Real Sepolia transaction: sends {formatEther(MOCK_ETH_TEST_AMOUNT)} ETH through
                BundleExecutor to MockRouter. Not for production. No 0x or aggregator routes.
              </StatusBanner>
              <dl className="space-y-2 text-sm">
                {mockExecute.gates.map((gate) => (
                  <div key={gate.id} className="flex justify-between gap-4">
                    <dt className="text-portx-muted">{gate.label}</dt>
                    <dd
                      className={`text-right ${
                        gate.passed ? 'text-portx-green' : 'text-portx-muted'
                      }`}
                    >
                      {gate.passed ? 'Yes' : 'No'}
                    </dd>
                  </div>
                ))}
              </dl>
              {mockExecute.disabledReason && !mockExecute.canExecute ? (
                <p className="text-xs text-portx-muted">
                  Disabled: {mockExecute.disabledReason}
                </p>
              ) : null}
              {mockExecute.status === 'pending' ? (
                <StatusBanner variant="info" compact>
                  Waiting for wallet signature or Sepolia confirmation…
                </StatusBanner>
              ) : null}
              {mockExecute.status === 'success' ? (
                <StatusBanner variant="success" compact>
                  Mock ETH basket executed successfully.
                </StatusBanner>
              ) : null}
              {mockExecute.status === 'error' && mockExecute.errorMessage ? (
                <StatusBanner variant="error" compact>
                  {mockExecute.errorMessage}
                </StatusBanner>
              ) : null}
              {mockExecute.txHash ? (
                <div className="text-sm space-y-1">
                  <p className="text-portx-muted">Transaction hash</p>
                  <p className="font-mono text-xs break-all">{mockExecute.txHash}</p>
                  {mockExecute.explorerUrl ? (
                    <a
                      href={mockExecute.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-portx-green text-sm underline"
                    >
                      View on Sepolia Etherscan
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => void mockExecute.execute()}
                  disabled={!mockExecute.canExecute}
                  className="btn-primary w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mockExecute.status === 'pending'
                    ? 'Running Mock ETH Basket Test…'
                    : 'Run Mock ETH Basket Test'}
                </button>
                {mockExecute.status === 'success' || mockExecute.status === 'error' ? (
                  <button
                    type="button"
                    onClick={mockExecute.reset}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <RecentTestSwaps className="mb-6" />

          <TestnetPortfolioSummary className="mb-6" compact />

          <div className="card mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Execution Readiness (Testnet)</h2>
              <span className="text-xs font-mono text-portx-muted">Phase B scaffold</span>
            </div>
            <StatusBanner variant="info" compact>
              {executionReadiness.executionLabel} — validation only; no transactions are sent.
            </StatusBanner>
            <dl className="space-y-2 text-sm">
              {executionReadiness.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <dt className="text-portx-muted">{item.label}</dt>
                  <dd
                    className={`text-right ${
                      item.passed ? 'text-portx-green' : 'text-portx-muted'
                    }`}
                  >
                    {item.passed ? 'Yes' : 'No'}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-1 border-t border-portx-border">
                <dt className="text-portx-muted font-medium">Execution status</dt>
                <dd className="text-right font-medium text-portx-warning">
                  {executionReadiness.executionLabel}
                </dd>
              </div>
            </dl>
            {executionReadiness.prepareResult.status === 'validation_errors' &&
            executionReadiness.prepareResult.errors.length > 0 ? (
              <p className="text-xs text-portx-muted">
                Validation scaffold: {executionReadiness.prepareResult.errors[0].message}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <p className="text-xs text-portx-muted text-center">
        Get a WalletConnect project ID at cloud.walletconnect.com and add it to .env
      </p>
    </div>
  )
}
