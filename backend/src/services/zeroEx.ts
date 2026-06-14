import { env } from '../config/env.js'
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  getTokenRouteMetadata,
  normalizeRouteSymbol,
  resolveQuoteTokenAddress,
  validateQuotePair,
} from '../config/supportedTokens.js'
import { getTokenPrices } from './coingecko.js'
import { buildExecutionMetadata } from '../utils/executionMetadata.js'
import type { ProviderQuote, QuoteRequest } from '../types/quote.js'

const ZEROX_QUOTE_URL = 'https://api.0x.org/swap/allowance-holder/quote'
const DEFAULT_TAKER = '0x0000000000000000000000000000000000000000'

export interface ZeroExSwapQuoteParams {
  chainId: number
  sellTokenSymbol: string
  buyTokenSymbol: string
  sellAmountUsd: number
  walletAddress?: string
  slippageBps: number
}

interface ZeroExApiQuote {
  buyAmount?: string
  sellAmount?: string
  buyToken?: string
  sellToken?: string
  allowanceTarget?: string
  transaction?: {
    to?: string
    data?: string
    value?: string
    gas?: string
    gasPrice?: string
  }
  issues?: {
    allowance?: {
      spender?: string
      actual?: string
    }
  }
  totalNetworkFee?: string
  estimatedPriceImpact?: string
  route?: {
    fills?: Array<{ source?: string }>
  }
}

export function isZeroExConfigured(): boolean {
  return Boolean(env.zeroXApiKey?.trim())
}

async function usdToSellAmountBase(sellSymbol: string, sellAmountUsd: number): Promise<string> {
  const symbol = normalizeRouteSymbol(sellSymbol)
  const prices = await getTokenPrices()
  const meta = getTokenRouteMetadata(sellSymbol)
  if (!meta) throw new Error(`Unknown token: ${sellSymbol}`)

  const live = prices[symbol]
  const priceUsd = live?.priceUsd ?? 0
  if (priceUsd <= 0) throw new Error(`Invalid price for ${symbol}`)

  const amount = sellAmountUsd / priceUsd
  const base = BigInt(Math.floor(amount * Math.pow(10, meta.decimals)))
  if (base <= 0n) throw new Error(`Sell amount too small for ${symbol}`)
  return base.toString()
}

function formatTokenAmount(symbol: string, amountBase: string): string {
  const meta = getTokenRouteMetadata(symbol)
  if (!meta) return '0'
  const value = Number(amountBase) / Math.pow(10, meta.decimals)
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(Math.min(8, meta.decimals))
}

function estimateGasUsd(totalNetworkFeeWei: string | undefined): number {
  if (!totalNetworkFeeWei) return 3.5
  const ethMeta = getTokenRouteMetadata('ETH')
  const ethPrice = ethMeta ? 3450 : 3450
  const feeEth = Number(totalNetworkFeeWei) / 1e18
  if (!Number.isFinite(feeEth)) return 3.5
  return Math.round(feeEth * ethPrice * 100) / 100
}

function buildRouteSummary(data: ZeroExApiQuote, sellSymbol: string, buySymbol: string): string {
  const sources = data.route?.fills?.map((f) => f.source).filter(Boolean) as string[] | undefined
  if (sources?.length) {
    return `${sellSymbol} → ${buySymbol} via ${[...new Set(sources)].join(', ')}`
  }
  return `${sellSymbol} → ${buySymbol} (0x)`
}

/**
 * GET 0x Swap API quote (Allowance Holder v2).
 * Requires ZEROX_API_KEY and Ethereum mainnet (chainId 1).
 */
export async function getSwapQuote(params: ZeroExSwapQuoteParams): Promise<ProviderQuote> {
  if (!isZeroExConfigured()) {
    throw new Error('ZEROX_API_KEY is not configured')
  }

  const routeCheck = validateQuotePair(
    params.sellTokenSymbol,
    params.buyTokenSymbol,
    params.chainId
  )
  if (!routeCheck.supported) {
    throw new Error(routeCheck.reason)
  }

  if (params.chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
    throw new Error(`0x quotes only supported on chainId 1 (got ${params.chainId})`)
  }

  const sellSymbol = normalizeRouteSymbol(params.sellTokenSymbol)
  const buySymbol = normalizeRouteSymbol(params.buyTokenSymbol)

  const sellAmount = await usdToSellAmountBase(sellSymbol, params.sellAmountUsd)
  const taker = params.walletAddress ?? DEFAULT_TAKER

  const query = new URLSearchParams({
    chainId: String(params.chainId),
    sellToken: resolveQuoteTokenAddress(sellSymbol),
    buyToken: resolveQuoteTokenAddress(buySymbol),
    sellAmount,
    taker,
    slippageBps: String(params.slippageBps),
  })

  const response = await fetch(`${ZEROX_QUOTE_URL}?${query}`, {
    headers: {
      Accept: 'application/json',
      '0x-api-key': env.zeroXApiKey,
      '0x-version': 'v2',
    },
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const errBody = (await response.json()) as { message?: string; reason?: string }
      detail = errBody.message ?? errBody.reason ?? detail
    } catch {
      /* ignore */
    }
    throw new Error(`0x API ${response.status}: ${detail}`)
  }

  const data = (await response.json()) as ZeroExApiQuote
  if (!data.buyAmount) {
    throw new Error('0x API returned no buyAmount')
  }

  const priceImpact = data.estimatedPriceImpact
    ? Math.abs(parseFloat(data.estimatedPriceImpact) * 100)
    : 0.1

  const calldata = data.transaction?.data
  const routerAddress = data.transaction?.to
  const spender = data.issues?.allowance?.spender ?? data.allowanceTarget ?? null
  const tokenIn = data.sellToken ?? resolveQuoteTokenAddress(sellSymbol)
  const tokenOut = data.buyToken ?? resolveQuoteTokenAddress(buySymbol)

  const execution = buildExecutionMetadata({
    chainId: params.chainId,
    sellAmount: data.sellAmount ?? sellAmount,
    buyAmount: data.buyAmount,
    spender,
    transactionTo: routerAddress,
    transactionData: calldata,
    transactionValue: data.transaction?.value ?? '0',
    gas: data.transaction?.gas,
    gasPrice: data.transaction?.gasPrice,
    tokenIn,
    tokenOut,
  })

  return {
    provider: '0x',
    fromToken: params.sellTokenSymbol,
    toToken: params.buyTokenSymbol,
    inputAmountUsd: params.sellAmountUsd,
    estimatedOutput: formatTokenAmount(buySymbol, data.buyAmount),
    estimatedGasUsd: estimateGasUsd(data.totalNetworkFee),
    priceImpactPercent: Number.isFinite(priceImpact) ? priceImpact : 0.1,
    routeSummary: buildRouteSummary(data, sellSymbol, buySymbol),
    calldata: execution.transactionData,
    routerAddress: execution.transactionTo,
    warnings: [],
    sellAmount: execution.sellAmount,
    buyAmount: execution.buyAmount,
    spender: execution.spender,
    transactionTo: execution.transactionTo,
    transactionData: execution.transactionData,
    transactionValue: execution.transactionValue,
    gas: execution.gas,
    gasPrice: execution.gasPrice,
    tokenIn: execution.tokenIn,
    tokenOut: execution.tokenOut,
    chainId: execution.chainId,
    hasExecutableCalldata: execution.hasExecutableCalldata,
    hasExactSellAmount: execution.hasExactSellAmount,
    requiresApproval: execution.requiresApproval,
  }
}

/** Map PortX leg quote request → 0x swap params */
export function quoteRequestToZeroEx(request: QuoteRequest): ZeroExSwapQuoteParams {
  return {
    chainId: request.chainId,
    sellTokenSymbol: request.inputToken,
    buyTokenSymbol: request.outputToken,
    sellAmountUsd: request.inputAmountUsd,
    walletAddress: request.walletAddress,
    slippageBps: request.slippageBps,
  }
}
