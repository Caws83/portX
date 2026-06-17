/**
 * F-5f — Internal mainnet pilot validation (read-only).
 * Run: npx tsx scripts/audit-mainnet-pilot.ts
 */
import { buyBasketQuote } from '../src/services/quoteEngine.js'
import { isLiveZeroXQuote } from '../src/services/quoteProviders.js'
import { PILOT_MIN_BUY_AMOUNT_USD } from '../src/config/pilot.js'

const PILOT_BASKET_ID = 'mainnet-pilot-link'
const PILOT_BUY_USD = 100
const PILOT_WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

async function main() {
  const quote = await buyBasketQuote({
    basketId: PILOT_BASKET_ID,
    chainId: 1,
    inputToken: 'USDC',
    inputAmountUsd: PILOT_BUY_USD,
    slippageBps: 100,
    walletAddress: PILOT_WALLET,
  })

  const leg = quote.quotes[0]
  const checks: Array<{ gate: string; pass: boolean; detail: string }> = [
    { gate: 'basket_single_leg', pass: quote.quotes.length === 1, detail: `${quote.quotes.length} leg(s)` },
    { gate: 'quote_mode_live', pass: quote.mode === 'live', detail: quote.mode },
    { gate: 'provider_0x', pass: leg?.provider === '0x', detail: leg?.provider ?? 'missing' },
    { gate: 'sellAmount', pass: Boolean(leg?.sellAmount), detail: leg?.sellAmount ?? 'missing' },
    { gate: 'buyAmount', pass: Boolean(leg?.buyAmount), detail: leg?.buyAmount ?? 'missing' },
    { gate: 'spender', pass: Boolean(leg?.spender), detail: leg?.spender ?? 'missing' },
    { gate: 'transactionTo', pass: Boolean(leg?.transactionTo), detail: leg?.transactionTo ?? 'missing' },
    {
      gate: 'transactionData',
      pass: Boolean(leg?.transactionData && leg.transactionData.length > 10),
      detail: leg?.transactionData ? `${leg.transactionData.length} chars` : 'missing',
    },
    {
      gate: 'hasExecutableCalldata',
      pass: leg?.hasExecutableCalldata === true,
      detail: String(leg?.hasExecutableCalldata),
    },
    {
      gate: 'hasExactSellAmount',
      pass: leg?.hasExactSellAmount === true,
      detail: String(leg?.hasExactSellAmount),
    },
    {
      gate: 'requiresApproval',
      pass: leg?.requiresApproval === true,
      detail: String(leg?.requiresApproval),
    },
    { gate: 'no_unsupported', pass: !quote.quotes.some((q) => q.provider === 'unsupported'), detail: 'ok' },
    {
      gate: 'pilot_min_notional',
      pass: PILOT_BUY_USD >= PILOT_MIN_BUY_AMOUNT_USD,
      detail: `${PILOT_BUY_USD} USDC`,
    },
    { gate: 'isLiveZeroXQuote', pass: Boolean(leg && isLiveZeroXQuote(leg)), detail: 'helper' },
  ]

  console.log(JSON.stringify({ basketId: PILOT_BASKET_ID, buyUsd: PILOT_BUY_USD, checks }, null, 2))
  const failed = checks.filter((c) => !c.pass)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
