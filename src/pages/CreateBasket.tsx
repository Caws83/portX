import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTokens } from '@/hooks/useTokens'
import { useBasketStore } from '@/store/basketStore'
import type { Token, TokenAllocation } from '@/types/token'
import type { Basket } from '@/types/basket'
import { getChainLabel } from '@/types/basketChain'
import { validateCreateBasket, isValidErc20Address } from '@/utils/createBasketValidation'
import {
  CREATE_BASKET_NETWORK_LABEL,
  getTokenRoutingSupportLabel,
  getTokenRoutingSupportStatus,
  summarizeBasketRoutingSupport,
  type TokenRoutingSupportStatus,
} from '@/utils/tokenRoutingSupport'
import { isTestnetBasketTokenSupported } from '@/config/testnetBasketTokens'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import { sum } from '@/utils/math'
import { StatusBadge } from '@/components/ui/StatusBadge'

function tokenSupportBadgeVariant(
  status: TokenRoutingSupportStatus,
): 'active' | 'planned' | 'unsupported' {
  if (status === 'supported') return 'active'
  if (status === 'planned') return 'planned'
  return 'unsupported'
}

function basketSupportTone(
  status: ReturnType<typeof summarizeBasketRoutingSupport>['status'],
): string {
  switch (status) {
    case 'fully-supported':
      return 'border-portx-green/40 bg-portx-green/10 text-portx-green'
    case 'partially-supported':
      return 'border-portx-warning/40 bg-portx-warning/10 text-portx-warning'
    case 'planned-routing':
      return 'border-portx-blue/40 bg-portx-blue/10 text-portx-blue'
    default:
      return 'border-portx-danger/40 bg-portx-danger/10 text-portx-danger'
  }
}

function customTokenFromAddress(address: string): Token {
  const normalized = address.trim() as `0x${string}`
  const symbol = `ERC20_${normalized.slice(2, 6).toUpperCase()}`
  return {
    symbol,
    name: `Custom token ${normalized.slice(0, 10)}…`,
    address: normalized,
    decimals: 18,
    priceUsd: 0,
    change24h: 0,
  }
}

export function CreateBasket() {
  const navigate = useNavigate()
  const addCustomBasket = useBasketStore((s) => s.addCustomBasket)
  const { tokens, tokensLoading, tokensError, tokensSource, getTokenBySymbol } = useTokens()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [customAddressError, setCustomAddressError] = useState<string | null>(null)
  const [customTokens, setCustomTokens] = useState<Record<string, Token>>({})
  const [selected, setSelected] = useState<Record<string, number>>({
    ETH: 40,
    BTC: 30,
    SOL: 30,
  })

  const catalogTokens = useMemo(() => {
    const merged = [...tokens]
    for (const token of Object.values(customTokens)) {
      if (!merged.some((t) => t.symbol === token.symbol)) {
        merged.push(token)
      }
    }
    return merged
  }, [tokens, customTokens])

  const filteredTokens = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return catalogTokens
    return catalogTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query),
    )
  }, [catalogTokens, searchQuery])

  const toggleToken = (symbol: string) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (symbol in next) {
        delete next[symbol]
      } else {
        next[symbol] = 0
      }
      return next
    })
  }

  const setWeight = (symbol: string, weight: number) => {
    setSelected((prev) => ({ ...prev, [symbol]: weight }))
  }

  const addTokenByAddress = () => {
    const trimmed = customAddress.trim()
    if (!isValidErc20Address(trimmed)) {
      setCustomAddressError('Enter a valid Ethereum-style address (0x + 40 hex chars).')
      return
    }
    const token = customTokenFromAddress(trimmed)
    setCustomTokens((prev) => ({ ...prev, [token.symbol]: token }))
    setSelected((prev) => ({ ...prev, [token.symbol]: prev[token.symbol] ?? 0 }))
    setCustomAddress('')
    setCustomAddressError(null)
  }

  const selectedSymbols = Object.keys(selected)
  const weights = Object.values(selected)
  const totalWeight = sum(weights)
  const validation = validateCreateBasket({
    name,
    selectedSymbols,
    weights,
  })
  const routingSummary = summarizeBasketRoutingSupport(selectedSymbols)

  const testnetExecutable =
    ENABLE_TESTNET_MODE &&
    selectedSymbols.length > 0 &&
    selectedSymbols.every((symbol) => isTestnetBasketTokenSupported(symbol))

  const handleSave = () => {
    if (!validation.isValid) return

    const allocations: TokenAllocation[] = Object.entries(selected).map(([symbol, weightPercent]) => {
      const token =
        getTokenBySymbol(symbol) ??
        customTokens[symbol] ??
        catalogTokens.find((t) => t.symbol === symbol)
      if (!token) throw new Error(`Unknown token: ${symbol}`)
      return { token, weightPercent }
    })

    const basket: Basket = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom user basket',
      tag: 'Custom',
      chain: 'ethereum',
      chainLabel: getChainLabel('ethereum'),
      chainStatus: ENABLE_TESTNET_MODE && !testnetExecutable ? 'planned' : 'active',
      allocations,
      isCustom: true,
      category: 'community',
      templateOnly: ENABLE_TESTNET_MODE && !testnetExecutable,
    }

    addCustomBasket(basket)
    navigate('/baskets')
  }

  const autoBalance = () => {
    const symbols = Object.keys(selected)
    if (symbols.length === 0) return
    const even = Math.floor(100 / symbols.length)
    const remainder = 100 - even * symbols.length
    const next: Record<string, number> = {}
    symbols.forEach((s, i) => {
      next[s] = even + (i === 0 ? remainder : 0)
    })
    setSelected(next)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="section-title mb-2">Create Basket</h1>
      <p className="text-portx-muted mb-8">
        {ENABLE_TESTNET_MODE
          ? 'Build a portfolio template. Only Sepolia-supported assets can execute live — others save as templates.'
          : 'Select tokens and set allocation percentages. Saved to your local basket catalog.'}
      </p>

      {tokensLoading && (
        <div className="mb-6 p-4 rounded-xl border border-portx-border bg-portx-surface text-sm text-portx-muted">
          Loading tokens…
        </div>
      )}

      {tokensError && tokensSource === 'fallback' && (
        <div className="mb-6 p-4 rounded-xl border border-portx-warning/50 bg-portx-warning/10 text-sm text-portx-warning">
          Could not reach API ({tokensError}). Showing offline fallback tokens.
        </div>
      )}

      <div className="card space-y-6 mb-8">
        <div>
          <label className="label" htmlFor="basket-name">
            Basket name
          </label>
          <input
            id="basket-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`input-field ${validation.nameError ? 'border-portx-danger/50' : ''}`}
            placeholder="My Growth Basket"
            aria-invalid={Boolean(validation.nameError)}
          />
          {validation.nameError ? (
            <p className="text-xs text-portx-danger mt-2">{validation.nameError}</p>
          ) : null}
        </div>
        <div>
          <label className="label" htmlFor="basket-desc">
            Description
          </label>
          <textarea
            id="basket-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[80px]"
            placeholder="Optional description"
          />
        </div>
        <div>
          <label className="label">Network</label>
          <div
            className="input-field bg-portx-surface text-portx-muted cursor-not-allowed opacity-90"
            aria-readonly="true"
          >
            {ENABLE_TESTNET_MODE ? 'Sepolia testnet (execution) · Ethereum templates' : CREATE_BASKET_NETWORK_LABEL}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Token allocation</h2>
          <button type="button" onClick={autoBalance} className="text-sm text-portx-green hover:underline">
            Auto-balance 100%
          </button>
        </div>

        <div className="mb-4">
          <label className="label" htmlFor="token-search">
            Search by symbol
          </label>
          <input
            id="token-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            placeholder="e.g. LINK, ETH, UNI"
          />
        </div>

        <div className="mb-4 p-4 rounded-xl border border-portx-border bg-portx-surface/50 space-y-2">
          <label className="label" htmlFor="custom-token-address">
            Add token by contract address
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="custom-token-address"
              value={customAddress}
              onChange={(e) => {
                setCustomAddress(e.target.value)
                setCustomAddressError(null)
              }}
              className="input-field flex-1 font-mono text-sm"
              placeholder="Paste any ERC-20 token address"
            />
            <button type="button" onClick={addTokenByAddress} className="btn-secondary shrink-0">
              Add token
            </button>
          </div>
          {customAddressError ? (
            <p className="text-xs text-portx-danger">{customAddressError}</p>
          ) : (
            <p className="text-xs text-portx-muted">
              Validates Ethereum-style 0x addresses. Custom tokens save as templates unless Sepolia-routable.
            </p>
          )}
        </div>

        <p
          className={`text-sm mb-2 ${totalWeight === 100 ? 'text-portx-green' : 'text-portx-danger'}`}
        >
          Total: {totalWeight.toFixed(1)}% {totalWeight === 100 ? '✓' : '(must equal 100%)'}
        </p>
        {validation.allocationError ? (
          <p className="text-xs text-portx-danger mb-2">{validation.allocationError}</p>
        ) : null}
        {validation.assetsError ? (
          <p className="text-xs text-portx-danger mb-4">{validation.assetsError}</p>
        ) : null}

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {!tokensLoading &&
            filteredTokens.map((token) => {
              const isOn = token.symbol in selected
              const supportStatus = getTokenRoutingSupportStatus(token.symbol)
              const testnetSupported = isTestnetBasketTokenSupported(token.symbol)
              return (
                <div
                  key={token.symbol}
                  className={`flex items-center gap-4 p-3 rounded-xl border ${
                    isOn ? 'border-portx-green/30 bg-portx-green/5' : 'border-portx-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggleToken(token.symbol)}
                    className="w-4 h-4 accent-portx-green"
                    disabled={tokensLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                      <StatusBadge
                        variant={tokenSupportBadgeVariant(supportStatus)}
                        label={getTokenRoutingSupportLabel(supportStatus)}
                        size="sm"
                      />
                      {ENABLE_TESTNET_MODE && (
                        <StatusBadge
                          variant={testnetSupported ? 'active' : 'planned'}
                          label={testnetSupported ? 'Sepolia' : 'Template only'}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="text-xs text-portx-muted truncate">{token.name}</div>
                    {token.address.startsWith('0x') && token.address.length === 42 && (
                      <div className="text-[10px] text-portx-muted font-mono truncate">{token.address}</div>
                    )}
                  </div>
                  {isOn && (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selected[token.symbol]}
                      onChange={(e) => setWeight(token.symbol, parseFloat(e.target.value) || 0)}
                      className="input-field w-24 text-right font-mono"
                    />
                  )}
                </div>
              )
            })}
        </div>
      </div>

      <div className="card mb-6 space-y-4">
        <h2 className="font-bold">Basket summary</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-portx-muted text-xs mb-1">Asset count</dt>
            <dd className="font-mono font-semibold">{selectedSymbols.length}</dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs mb-1">Total allocation</dt>
            <dd className={`font-mono font-semibold ${totalWeight === 100 ? 'text-portx-green' : 'text-portx-danger'}`}>
              {totalWeight.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-portx-muted text-xs mb-1">Estimated support</dt>
            <dd>{routingSummary.label}</dd>
          </div>
          {ENABLE_TESTNET_MODE && (
            <div>
              <dt className="text-portx-muted text-xs mb-1">Sepolia execution</dt>
              <dd>{testnetExecutable ? 'Supported assets' : 'Routing not available yet'}</dd>
            </div>
          )}
        </dl>
        <div className={`rounded-xl border p-3 text-sm ${basketSupportTone(routingSummary.status)}`}>
          <p className="font-semibold">{routingSummary.label}</p>
          <p className="text-xs mt-1 opacity-90">
            {ENABLE_TESTNET_MODE && !testnetExecutable
              ? 'Routing not available yet — basket will save as a template.'
              : routingSummary.detail}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!validation.isValid || tokensLoading}
        className="btn-primary w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Save Basket
      </button>
    </div>
  )
}
