import { useEffect, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_STABLECOIN,
  SLIPPAGE_OPTIONS,
  STABLECOIN_OPTIONS,
  type StablecoinOption,
} from '@/config/constants'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { truncateAddress, formatUsd } from '@/utils/format'
import { usePortfolio } from '@/hooks/usePortfolio'

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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-8">Settings</h1>

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

      <p className="text-xs text-portx-muted text-center">
        Get a WalletConnect project ID at cloud.walletconnect.com and add it to .env
      </p>
    </div>
  )
}
