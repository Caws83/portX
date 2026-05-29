import { useState } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { BasketCard } from '@/components/BasketCard'
import { useBasket } from '@/hooks/useBasket'
import { useSwapQuote } from '@/hooks/useSwapQuote'
import { executeBasketBuy, executeBasketSell } from '@/services/dexRouter'
import type { Basket } from '@/types/basket'

const DEMO_BUY_AMOUNT = 1000

export function Baskets() {
  const { allBaskets } = useBasket()
  const buyBasket = usePortfolioStore((s) => s.buyBasket)
  const sellBasket = usePortfolioStore((s) => s.sellBasket)
  const activeBaskets = usePortfolioStore((s) => s.activeBaskets)
  const { fetchQuotes, loading } = useSwapQuote()
  const [txMsg, setTxMsg] = useState<string | null>(null)

  const ownedIds = new Set(activeBaskets.map((b) => b.basketId))

  const handleBuy = async (basket: Basket) => {
    setTxMsg(null)
    // DEX ROUTER: fetch aggregated quotes per allocation leg
    const quotes = await fetchQuotes(basket, DEMO_BUY_AMOUNT)
    if (quotes.length === 0) return

    // SMART CONTRACT: submit buy transaction with swap calldata
    const { txHash } = await executeBasketBuy(quotes)
    buyBasket({
      basketId: basket.id,
      amountUsd: DEMO_BUY_AMOUNT,
      purchasedAt: Date.now(),
      entryValueUsd: DEMO_BUY_AMOUNT,
    })
    setTxMsg(`Demo buy complete · ${basket.name} · tx ${txHash.slice(0, 10)}...`)
  }

  const handleSell = async (basketId: string) => {
    setTxMsg(null)
    await executeBasketSell(basketId)
    sellBasket(basketId)
    setTxMsg('Demo basket sold.')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="section-title">Crypto Baskets</h1>
        <p className="text-portx-muted mt-1">
          Buy a diversified portfolio in one transaction flow (demo).
        </p>
      </div>

      {txMsg && (
        <div className="mb-6 p-4 rounded-xl border border-portx-green/30 bg-portx-green/10 text-sm text-portx-green">
          {txMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {allBaskets.map((basket) => (
          <BasketCard
            key={basket.id}
            basket={basket}
            onBuy={handleBuy}
            onSell={handleSell}
            isOwned={ownedIds.has(basket.id)}
            loading={loading}
          />
        ))}
      </div>

      <div className="mt-10 card border-dashed">
        <p className="text-sm text-portx-muted text-center">
          {/* DEX integration: 0x / 1inch / Uniswap quotes merged in dexRouter.ts */}
          Live routing will compare quotes across aggregators and execute optimal paths per basket leg.
        </p>
      </div>
    </div>
  )
}
