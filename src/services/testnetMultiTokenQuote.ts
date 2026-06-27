import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  http,
  parseAbi,
  type Address,
} from 'viem'
import { sepolia } from 'viem/chains'
import {
  resolveTestnetBasketToken,
  toQuoteToken,
  type TestnetBasketToken,
} from '@/config/testnetBasketTokens'
import {
  TESTNET_DEFAULT_SLIPPAGE_BPS,
  TESTNET_DEFAULT_SWAP_AMOUNT_WEI,
  TESTNET_QUOTER_V2_ADDRESS,
  TESTNET_SEPOLIA_CHAIN_ID,
  TESTNET_SWAP_ROUTER02_ADDRESS,
  TESTNET_USDC_ADDRESS,
  TESTNET_WETH_ADDRESS,
} from '@/config/testnetExecution'
import type { BasketQuotePreview, QuoteResponse } from '@/types/quote'
import type { TokenAllocation } from '@/types/token'
import { TESTNET_MAX_BASKET_LEGS } from '@/config/testnetExecution'
import { ZERO_ADDRESS } from '@/utils/addresses'
import {
  applyTestnetSlippage,
  assertTestnetSwapAmount,
  selectTestnetBasketAllocations,
  splitTestnetEthAcrossLegs,
} from '@/services/testnetUniswapQuote'

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

const WETH_DEPOSIT_ABI = parseAbi(['function deposit() payable'])

const ETH_TOKEN = {
  symbol: 'ETH',
  name: 'Ether',
  address: ZERO_ADDRESS,
  decimals: 18,
  priceUsd: 0,
  change24h: 0,
} as const

const USDC_TOKEN = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: TESTNET_USDC_ADDRESS,
  decimals: 6,
  priceUsd: 1,
  change24h: 0,
} as const

export interface TestnetSwapLegParams {
  outputToken: TestnetBasketToken
  amountInWei: bigint
  slippageBps: number
  recipient?: Address
  usdcNotionalDisplay?: string
}

export interface TestnetSwapLegQuote {
  details: {
    chainId: typeof TESTNET_SEPOLIA_CHAIN_ID
    amountInWei: bigint
    slippageBps: number
    quotedAmountOut: bigint
    minAmountOut: bigint
    calldata: `0x${string}`
    calldataByteLength: number
    routerAddress: Address
    tokenOut: TestnetBasketToken
  }
  quote: QuoteResponse
}

export function splitTestnetUsdcAcrossLegs(totalUsdc: bigint, weights: number[]): bigint[] {
  if (weights.length === 0) return []
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum <= 0) return weights.map(() => 0n)

  const amounts: bigint[] = []
  let allocated = 0n

  for (let index = 0; index < weights.length; index++) {
    if (index === weights.length - 1) {
      amounts.push(totalUsdc - allocated)
      continue
    }
    const share =
      (totalUsdc * BigInt(Math.round(weights[index] * 100))) /
      BigInt(Math.round(weightSum * 100))
    amounts.push(share)
    allocated += share
  }

  return amounts
}

export function isTestnetWethOutputToken(token: TestnetBasketToken): boolean {
  return (
    token.symbol.toUpperCase() === 'WETH' ||
    token.address.toLowerCase() === TESTNET_WETH_ADDRESS.toLowerCase()
  )
}

export function encodeTestnetWethDepositCalldata(): `0x${string}` {
  return encodeFunctionData({
    abi: WETH_DEPOSIT_ABI,
    functionName: 'deposit',
  })
}

export async function quoteWethToTokenOnSepolia(
  tokenOut: Address,
  amountInWei: bigint,
  poolFee: number,
): Promise<bigint> {
  const result = await sepoliaPublicClient.readContract({
    address: TESTNET_QUOTER_V2_ADDRESS,
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: TESTNET_WETH_ADDRESS,
        tokenOut,
        amountIn: amountInWei,
        fee: poolFee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })

  return result[0]
}

export async function quoteEthToUsdcWeiOnSepolia(amountInWei: bigint): Promise<bigint> {
  const usdcToken = resolveTestnetBasketToken('USDC')
  if (!usdcToken) throw new Error('USDC token config missing')
  return quoteWethToTokenOnSepolia(usdcToken.address, amountInWei, usdcToken.poolFee)
}

export function encodeTestnetExactInputSingleCalldata(params: {
  tokenOut: Address
  amountInWei: bigint
  minAmountOut: bigint
  recipient: Address
  poolFee: number
}): `0x${string}` {
  return encodeFunctionData({
    abi: SWAP_ROUTER02_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: TESTNET_WETH_ADDRESS,
        tokenOut: params.tokenOut,
        fee: params.poolFee,
        recipient: params.recipient,
        amountIn: params.amountInWei,
        amountOutMinimum: params.minAmountOut,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })
}

function estimateOutputUsd(amountOut: bigint, token: TestnetBasketToken): number {
  const units = Number.parseFloat(formatUnits(amountOut, token.decimals))
  return units * token.priceUsd
}

function buildTestnetWethWrapLegQuote(params: TestnetSwapLegParams): TestnetSwapLegQuote {
  assertTestnetSwapAmount(params.amountInWei)

  const quotedAmountOut = params.amountInWei
  const minAmountOut = applyTestnetSlippage(quotedAmountOut, params.slippageBps)
  const calldata = encodeTestnetWethDepositCalldata()
  const outputToken = toQuoteToken(params.outputToken)

  const quote: QuoteResponse = {
    provider: 'uniswap-sepolia',
    inputToken: { ...ETH_TOKEN },
    outputToken,
    inputAmount: params.amountInWei.toString(),
    inputAmountUsd: 0,
    outputAmount: quotedAmountOut.toString(),
    outputAmountUsd: estimateOutputUsd(quotedAmountOut, params.outputToken),
    estimatedGasUsd: 0,
    estimatedGasUnits: 50_000,
    priceImpactPercent: 0,
    routeSummary: [
      params.usdcNotionalDisplay
        ? `${params.usdcNotionalDisplay} USDC`
        : formatEther(params.amountInWei),
      'WETH',
      'deposit',
    ],
    calldata,
    routerAddress: TESTNET_WETH_ADDRESS,
    warnings: [
      'Sepolia testnet WETH wrap — native ETH deposited 1:1 via WETH9.deposit().',
      `Min out after ${params.slippageBps} bps slippage: ${minAmountOut.toString()} wei.`,
    ],
    testnetDisplayRoute: params.usdcNotionalDisplay
      ? {
          inputSymbol: 'USDC',
          inputAmountDisplay: params.usdcNotionalDisplay,
        }
      : undefined,
    testnetSwap: {
      tokenIn: ZERO_ADDRESS,
      tokenOut: TESTNET_WETH_ADDRESS,
      nativeEth: true,
      wethWrap: true,
    },
  }

  return {
    details: {
      chainId: TESTNET_SEPOLIA_CHAIN_ID,
      amountInWei: params.amountInWei,
      slippageBps: params.slippageBps,
      quotedAmountOut,
      minAmountOut,
      calldata,
      calldataByteLength: (calldata.length - 2) / 2,
      routerAddress: TESTNET_WETH_ADDRESS,
      tokenOut: params.outputToken,
    },
    quote,
  }
}

export async function buildTestnetSwapLegQuote(
  params: TestnetSwapLegParams,
): Promise<TestnetSwapLegQuote> {
  if (isTestnetWethOutputToken(params.outputToken)) {
    return buildTestnetWethWrapLegQuote(params)
  }

  assertTestnetSwapAmount(params.amountInWei)

  const quotedAmountOut = await quoteWethToTokenOnSepolia(
    params.outputToken.address,
    params.amountInWei,
    params.outputToken.poolFee,
  )
  const minAmountOut = applyTestnetSlippage(quotedAmountOut, params.slippageBps)
  const recipient = params.recipient ?? ('0x0000000000000000000000000000000000000001' as Address)
  const calldata = encodeTestnetExactInputSingleCalldata({
    tokenOut: params.outputToken.address,
    amountInWei: params.amountInWei,
    minAmountOut,
    recipient,
    poolFee: params.outputToken.poolFee,
  })

  const outputToken = toQuoteToken(params.outputToken)
  const quote: QuoteResponse = {
    provider: 'uniswap-sepolia',
    inputToken: { ...ETH_TOKEN },
    outputToken,
    inputAmount: params.amountInWei.toString(),
    inputAmountUsd: 0,
    outputAmount: quotedAmountOut.toString(),
    outputAmountUsd: estimateOutputUsd(quotedAmountOut, params.outputToken),
    estimatedGasUsd: 0,
    estimatedGasUnits: 150_000,
    priceImpactPercent: 0,
    routeSummary: [
      params.usdcNotionalDisplay
        ? `${params.usdcNotionalDisplay} USDC`
        : formatEther(params.amountInWei),
      'WETH',
      params.outputToken.symbol,
      `(V3 ${params.outputToken.poolFee / 10_000}%)`,
    ],
    calldata,
    routerAddress: TESTNET_SWAP_ROUTER02_ADDRESS,
    warnings: [
      'Sepolia testnet Uniswap V3 quote.',
      `Quoted min out after ${params.slippageBps} bps slippage: ${minAmountOut.toString()} (${params.outputToken.decimals} decimals).`,
    ],
    testnetDisplayRoute: params.usdcNotionalDisplay
      ? {
          inputSymbol: 'USDC',
          inputAmountDisplay: params.usdcNotionalDisplay,
        }
      : undefined,
    testnetSwap: {
      tokenIn: TESTNET_WETH_ADDRESS,
      tokenOut: params.outputToken.address,
      poolFee: params.outputToken.poolFee,
      nativeEth: true,
    },
  }

  return {
    details: {
      chainId: TESTNET_SEPOLIA_CHAIN_ID,
      amountInWei: params.amountInWei,
      slippageBps: params.slippageBps,
      quotedAmountOut,
      minAmountOut,
      calldata,
      calldataByteLength: (calldata.length - 2) / 2,
      routerAddress: TESTNET_SWAP_ROUTER02_ADDRESS,
      tokenOut: params.outputToken,
    },
    quote,
  }
}

export function resolveAllocationOutputToken(allocation: TokenAllocation): TestnetBasketToken {
  const resolved = resolveTestnetBasketToken(allocation.token.symbol)
  if (!resolved) {
    throw new Error(`Unsupported Sepolia basket token: ${allocation.token.symbol}`)
  }
  return resolved
}

export interface TestnetMultiTokenBasketParams {
  basketId?: string
  basketName?: string
  amountInWei?: bigint
  slippageBps?: number
  allocations: TokenAllocation[]
}

/** Build multi-token basket preview — one ETH leg per allocation output token */
export async function buildTestnetMultiTokenBasketPreview(
  params: TestnetMultiTokenBasketParams,
  recipient?: Address,
): Promise<BasketQuotePreview> {
  const totalAmountWei = params.amountInWei ?? TESTNET_DEFAULT_SWAP_AMOUNT_WEI
  const slippageBps = params.slippageBps ?? TESTNET_DEFAULT_SLIPPAGE_BPS
  assertTestnetSwapAmount(totalAmountWei)

  const selectedAllocations = selectTestnetBasketAllocations(params.allocations)
  if (selectedAllocations.length === 0) {
    throw new Error('Basket allocations are required for multi-token testnet preview')
  }

  const totalUsdcQuoted = await quoteEthToUsdcWeiOnSepolia(totalAmountWei)
  const usdcLegAmounts = splitTestnetUsdcAcrossLegs(
    totalUsdcQuoted,
    selectedAllocations.map((allocation) => allocation.weightPercent),
  )
  const ethLegAmounts = splitTestnetEthAcrossLegs(
    totalAmountWei,
    selectedAllocations.map((allocation) => allocation.weightPercent),
  )

  const legResults = await Promise.all(
    selectedAllocations.map((allocation, index) => {
      const outputToken = resolveAllocationOutputToken(allocation)
      const usdcNotionalDisplay = formatUnits(usdcLegAmounts[index], USDC_TOKEN.decimals)
      return buildTestnetSwapLegQuote({
        outputToken,
        amountInWei: ethLegAmounts[index],
        slippageBps,
        recipient,
        usdcNotionalDisplay,
      })
    }),
  )

  const legs = legResults.map(({ quote }, index) => ({
    allocation: {
      token: quote.outputToken,
      weightPercent: selectedAllocations[index].weightPercent,
      inputAmountUsd: 0,
      inputAmount: quote.inputAmount,
    },
    bestQuote: quote,
    allQuotes: [quote],
  }))

  const totalOutputUsd = legs.reduce((sum, leg) => sum + leg.bestQuote.outputAmountUsd, 0)
  const totalGasUsd = legs.reduce((sum, leg) => sum + leg.bestQuote.estimatedGasUsd, 0)
  const truncatedNote =
    params.allocations.length > TESTNET_MAX_BASKET_LEGS
      ? `Using first ${TESTNET_MAX_BASKET_LEGS} basket allocations for testnet execution.`
      : null

  return {
    type: 'buy',
    basketId: params.basketId,
    basketName: params.basketName,
    totalInputUsd: 0,
    totalOutputUsd,
    totalGasUsd,
    slippageBps,
    chainId: TESTNET_SEPOLIA_CHAIN_ID,
    legs,
    warnings: [
      'Sepolia multi-token basket — each leg acquires a distinct output token.',
      `Funding model: ${formatEther(totalAmountWei)} ETH split across ${legs.length} swap/wrap legs.`,
      `USDC notional reference: ${formatUnits(totalUsdcQuoted, USDC_TOKEN.decimals)} USDC total.`,
      `Multi-leg executeBasket: ${legs.length} SwapCall(s) in one transaction.`,
      ...(truncatedNote ? [truncatedNote] : []),
      ...legs.flatMap((leg) => leg.bestQuote.warnings),
    ],
    isDemo: false,
    createdAt: Date.now(),
  }
}

export function shouldUseMultiTokenTestnetQuote(allocations: TokenAllocation[]): boolean {
  if (allocations.length < 2) return false

  const outputs = allocations
    .map((allocation) => resolveTestnetBasketToken(allocation.token.symbol))
    .filter((token): token is NonNullable<typeof token> => token !== null)

  if (outputs.length !== allocations.length) return false

  const uniqueAddresses = new Set(outputs.map((token) => token.address.toLowerCase()))
  if (uniqueAddresses.size < 2) return false

  const allUsdc = outputs.every((token) => token.symbol === 'USDC')
  return !allUsdc
}
