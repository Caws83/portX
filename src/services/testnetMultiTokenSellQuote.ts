import {
  createPublicClient,
  encodeFunctionData,
  formatUnits,
  http,
  parseAbi,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  getTestnetSellUsdcPoolFee,
  resolveTestnetBasketToken,
  toQuoteToken,
  type TestnetBasketToken,
} from '@/config/testnetBasketTokens'
import {
  TESTNET_DEFAULT_SLIPPAGE_BPS,
  TESTNET_QUOTER_V2_ADDRESS,
  TESTNET_SEPOLIA_CHAIN_ID,
  TESTNET_SWAP_ROUTER02_ADDRESS,
  TESTNET_USDC_ADDRESS,
} from '@/config/testnetExecution'
import type { BasketQuotePreview, QuoteResponse } from '@/types/quote'
import type { TokenAllocation } from '@/types/token'
import { TESTNET_MAX_BASKET_LEGS } from '@/config/testnetExecution'
import {
  applyTestnetSlippage,
  selectTestnetBasketAllocations,
} from '@/services/testnetUniswapQuote'
import { resolveAllocationOutputToken } from '@/services/testnetMultiTokenQuote'

const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

const QUOTER_V2_ABI = parseAbi([
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
])

const SWAP_ROUTER02_ABI = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
])

const USDC_TOKEN = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: TESTNET_USDC_ADDRESS,
  decimals: 6,
  priceUsd: 1,
  change24h: 0,
} as const

export interface TestnetSellLegParams {
  inputToken: TestnetBasketToken
  amountIn: bigint
  slippageBps: number
  recipient?: Address
}

export async function quoteTokenToUsdcOnSepolia(
  tokenIn: Address,
  amountIn: bigint,
  poolFee: number,
): Promise<bigint> {
  const result = await sepoliaPublicClient.readContract({
    address: TESTNET_QUOTER_V2_ADDRESS,
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn,
        tokenOut: TESTNET_USDC_ADDRESS,
        amountIn,
        fee: poolFee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })

  return result[0]
}

export function encodeTestnetTokenToUsdcCalldata(params: {
  tokenIn: Address
  amountIn: bigint
  minAmountOut: bigint
  recipient: Address
  poolFee: number
}): `0x${string}` {
  return encodeFunctionData({
    abi: SWAP_ROUTER02_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: params.tokenIn,
        tokenOut: TESTNET_USDC_ADDRESS,
        fee: params.poolFee,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.minAmountOut,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })
}

function estimateOutputUsd(amountOut: bigint, decimals: number): number {
  const units = Number.parseFloat(formatUnits(amountOut, decimals))
  return units * USDC_TOKEN.priceUsd
}

export async function buildTestnetSellLegQuote(
  params: TestnetSellLegParams,
): Promise<QuoteResponse> {
  if (params.amountIn <= 0n) {
    throw new Error(`Sell amount must be greater than zero for ${params.inputToken.symbol}`)
  }

  const sellPoolFee = getTestnetSellUsdcPoolFee(params.inputToken)
  const quotedAmountOut = await quoteTokenToUsdcOnSepolia(
    params.inputToken.address,
    params.amountIn,
    sellPoolFee,
  )
  const minAmountOut = applyTestnetSlippage(quotedAmountOut, params.slippageBps)
  const recipient = params.recipient ?? ('0x0000000000000000000000000000000000000001' as Address)
  const calldata = encodeTestnetTokenToUsdcCalldata({
    tokenIn: params.inputToken.address,
    amountIn: params.amountIn,
    minAmountOut,
    recipient,
    poolFee: sellPoolFee,
  })

  const inputToken = toQuoteToken(params.inputToken)
  const amountInDisplay = formatUnits(params.amountIn, params.inputToken.decimals)

  return {
    provider: 'uniswap-sepolia',
    inputToken,
    outputToken: { ...USDC_TOKEN },
    inputAmount: params.amountIn.toString(),
    inputAmountUsd: 0,
    outputAmount: quotedAmountOut.toString(),
    outputAmountUsd: estimateOutputUsd(quotedAmountOut, USDC_TOKEN.decimals),
    estimatedGasUsd: 0,
    estimatedGasUnits: 150_000,
    priceImpactPercent: 0,
    routeSummary: [
      params.inputToken.symbol,
      'USDC',
      `(V3 ${sellPoolFee / 10_000}%)`,
    ],
    calldata,
    routerAddress: TESTNET_SWAP_ROUTER02_ADDRESS,
    warnings: [
      'Sepolia testnet Uniswap V3 sell quote — not for production execution.',
      `Quoted min USDC out after ${params.slippageBps} bps slippage: ${minAmountOut.toString()}.`,
    ],
    testnetDisplayRoute: {
      inputSymbol: params.inputToken.symbol,
      inputAmountDisplay: amountInDisplay,
    },
    testnetSwap: {
      tokenIn: params.inputToken.address,
      tokenOut: TESTNET_USDC_ADDRESS,
      poolFee: sellPoolFee,
      nativeEth: false,
    },
  }
}

export interface TestnetMultiTokenSellParams {
  basketId?: string
  basketName?: string
  slippageBps?: number
  allocations: TokenAllocation[]
  /** Wallet balances keyed by token symbol (e.g. LINK, WETH) */
  balancesWei: Record<string, bigint>
  recipient?: Address
}

/** Build multi-token sell preview — one ERC20 leg per held basket token → USDC */
export async function buildTestnetMultiTokenSellPreview(
  params: TestnetMultiTokenSellParams,
): Promise<BasketQuotePreview> {
  const slippageBps = params.slippageBps ?? TESTNET_DEFAULT_SLIPPAGE_BPS
  const selectedAllocations = selectTestnetBasketAllocations(params.allocations)
  if (selectedAllocations.length === 0) {
    throw new Error('Basket allocations are required for multi-token testnet sell preview')
  }

  const legEntries: { allocation: TokenAllocation; quote: QuoteResponse }[] = []
  for (const allocation of selectedAllocations) {
    const inputToken = resolveAllocationOutputToken(allocation)
    if (inputToken.symbol === 'USDC') continue

    const configured = resolveTestnetBasketToken(inputToken.symbol)
    if (!configured?.sellUsdcPoolFee) {
      throw new Error(`Sepolia sell route unsupported for ${inputToken.symbol}`)
    }

    const amountIn = params.balancesWei[inputToken.symbol.toUpperCase()] ?? 0n
    if (amountIn <= 0n) {
      throw new Error(`No ${inputToken.symbol} balance to sell`)
    }

    legEntries.push({
      allocation,
      quote: await buildTestnetSellLegQuote({
        inputToken: configured,
        amountIn,
        slippageBps,
        recipient: params.recipient,
      }),
    })
  }

  if (legEntries.length === 0) {
    throw new Error('No sell legs with positive wallet balance')
  }

  const legs = legEntries.map(({ allocation, quote }) => ({
    allocation: {
      token: quote.inputToken,
      weightPercent: allocation.weightPercent,
      inputAmountUsd: 0,
      inputAmount: quote.inputAmount,
    },
    bestQuote: quote,
    allQuotes: [quote],
  }))

  const totalOutputUsd = legs.reduce((sum, leg) => sum + leg.bestQuote.outputAmountUsd, 0)
  const totalGasUsd = legs.reduce((sum, leg) => sum + leg.bestQuote.estimatedGasUsd, 0)
  const totalUsdcOut = legs.reduce(
    (sum, leg) => sum + BigInt(leg.bestQuote.outputAmount),
    0n,
  )
  const truncatedNote =
    params.allocations.length > TESTNET_MAX_BASKET_LEGS
      ? `Using first ${TESTNET_MAX_BASKET_LEGS} basket allocations for testnet sell.`
      : null

  return {
    type: 'sell_basket',
    basketId: params.basketId,
    basketName: params.basketName,
    totalInputUsd: 0,
    totalOutputUsd,
    totalGasUsd,
    slippageBps,
    chainId: TESTNET_SEPOLIA_CHAIN_ID,
    legs,
    warnings: [
      'Sepolia multi-token sell — each leg swaps a held basket token to USDC.',
      `Estimated total USDC out: ${formatUnits(totalUsdcOut, USDC_TOKEN.decimals)} USDC.`,
      `Multi-leg executeBasket: ${legs.length} ERC20 SwapCall(s), msg.value = 0.`,
      ...(truncatedNote ? [truncatedNote] : []),
      ...legs.flatMap((leg) => leg.bestQuote.warnings),
    ],
    isDemo: false,
    createdAt: Date.now(),
  }
}
