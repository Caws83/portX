import { createPublicClient, encodeFunctionData, formatEther, formatUnits, http, parseAbi } from 'viem'
import { sepolia } from 'viem/chains'
import {
  TESTNET_BUNDLE_EXECUTOR_ADDRESS,
  TESTNET_DEFAULT_SLIPPAGE_BPS,
  TESTNET_DEFAULT_SWAP_AMOUNT_WEI,
  TESTNET_MAX_SWAP_AMOUNT_WEI,
  TESTNET_QUOTER_V2_ADDRESS,
  TESTNET_SEPOLIA_CHAIN_ID,
  TESTNET_SWAP_ROUTER02_ADDRESS,
  TESTNET_UNISWAP_POOL_FEE,
  TESTNET_USDC_ADDRESS,
  TESTNET_WETH_ADDRESS,
} from '@/config/testnetExecution'
import type { BasketQuotePreview, QuoteResponse } from '@/types/quote'
import { ZERO_ADDRESS } from '@/utils/addresses'

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

export interface TestnetUniswapQuoteParams {
  basketId?: string
  basketName?: string
  amountInWei?: bigint
  slippageBps?: number
}

export interface TestnetUniswapQuoteDetails {
  chainId: typeof TESTNET_SEPOLIA_CHAIN_ID
  amountInWei: bigint
  slippageBps: number
  quotedAmountOut: bigint
  minAmountOut: bigint
  calldata: `0x${string}`
  calldataByteLength: number
  routerAddress: typeof TESTNET_SWAP_ROUTER02_ADDRESS
}

export function applyTestnetSlippage(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * BigInt(10_000 - slippageBps)) / 10_000n
}

export function assertTestnetSwapAmount(amountInWei: bigint): void {
  if (amountInWei <= 0n) {
    throw new Error('Swap amount must be greater than zero')
  }
  if (amountInWei > TESTNET_MAX_SWAP_AMOUNT_WEI) {
    throw new Error(
      `Swap amount exceeds testnet cap of ${formatEther(TESTNET_MAX_SWAP_AMOUNT_WEI)} ETH`,
    )
  }
}

/** Read-only QuoterV2 quote for WETH → USDC on Sepolia */
export async function quoteEthToUsdcOnSepolia(amountInWei: bigint): Promise<bigint> {
  assertTestnetSwapAmount(amountInWei)

  const result = await sepoliaPublicClient.readContract({
    address: TESTNET_QUOTER_V2_ADDRESS,
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: TESTNET_WETH_ADDRESS,
        tokenOut: TESTNET_USDC_ADDRESS,
        amountIn: amountInWei,
        fee: TESTNET_UNISWAP_POOL_FEE,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })

  return result[0]
}

export function encodeUniswapExactInputSingleCalldata(
  amountInWei: bigint,
  minAmountOut: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: SWAP_ROUTER02_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: TESTNET_WETH_ADDRESS,
        tokenOut: TESTNET_USDC_ADDRESS,
        fee: TESTNET_UNISWAP_POOL_FEE,
        recipient: TESTNET_BUNDLE_EXECUTOR_ADDRESS,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })
}

/** Read-only quote + calldata assembly — no wallet or executeBasket calls */
export async function buildTestnetUniswapQuoteDetails(
  params: TestnetUniswapQuoteParams = {},
): Promise<TestnetUniswapQuoteDetails> {
  const amountInWei = params.amountInWei ?? TESTNET_DEFAULT_SWAP_AMOUNT_WEI
  const slippageBps = params.slippageBps ?? TESTNET_DEFAULT_SLIPPAGE_BPS

  const quotedAmountOut = await quoteEthToUsdcOnSepolia(amountInWei)
  const minAmountOut = applyTestnetSlippage(quotedAmountOut, slippageBps)
  const calldata = encodeUniswapExactInputSingleCalldata(amountInWei, minAmountOut)

  return {
    chainId: TESTNET_SEPOLIA_CHAIN_ID,
    amountInWei,
    slippageBps,
    quotedAmountOut,
    minAmountOut,
    calldata,
    calldataByteLength: (calldata.length - 2) / 2,
    routerAddress: TESTNET_SWAP_ROUTER02_ADDRESS,
  }
}

function buildQuoteResponse(
  details: TestnetUniswapQuoteDetails,
): QuoteResponse {
  const outputAmountUsd = Number.parseFloat(formatUnits(details.quotedAmountOut, USDC_TOKEN.decimals))

  return {
    provider: 'uniswap-sepolia',
    inputToken: { ...ETH_TOKEN },
    outputToken: { ...USDC_TOKEN },
    inputAmount: details.amountInWei.toString(),
    inputAmountUsd: 0,
    outputAmount: details.quotedAmountOut.toString(),
    outputAmountUsd,
    estimatedGasUsd: 0,
    estimatedGasUnits: 150_000,
    priceImpactPercent: 0,
    routeSummary: ['ETH', 'WETH', 'USDC', `(V3 ${TESTNET_UNISWAP_POOL_FEE / 10_000}%)`],
    calldata: details.calldata,
    routerAddress: details.routerAddress,
    warnings: [
      'Sepolia testnet Uniswap V3 quote — not for production execution.',
      `Quoted min out after ${details.slippageBps} bps slippage: ${details.minAmountOut.toString()} (6 decimals).`,
    ],
  }
}

/** Build BasketQuotePreview for testnet single-leg ETH → USDC — read-only RPC only */
export async function buildTestnetEthToUsdcBasketPreview(
  params: TestnetUniswapQuoteParams = {},
): Promise<BasketQuotePreview> {
  const details = await buildTestnetUniswapQuoteDetails(params)
  const quote = buildQuoteResponse(details)

  return {
    type: 'buy',
    basketId: params.basketId,
    basketName: params.basketName,
    totalInputUsd: 0,
    totalOutputUsd: quote.outputAmountUsd,
    totalGasUsd: quote.estimatedGasUsd,
    slippageBps: details.slippageBps,
    chainId: TESTNET_SEPOLIA_CHAIN_ID,
    legs: [
      {
        allocation: {
          token: quote.inputToken,
          weightPercent: 100,
          inputAmountUsd: 0,
          inputAmount: quote.inputAmount,
        },
        bestQuote: quote,
        allQuotes: [quote],
      },
    ],
    warnings: [
      'Frontend-only Sepolia Uniswap quote — does not use backend or 0x routes.',
      ...quote.warnings,
    ],
    isDemo: false,
    createdAt: Date.now(),
  }
}

/** Dev helper — logs quote details without UI or wallet interaction */
export async function previewTestnetUniswapQuote(
  params: TestnetUniswapQuoteParams = {},
): Promise<TestnetUniswapQuoteDetails> {
  const details = await buildTestnetUniswapQuoteDetails(params)
  console.info('[PortX] Sepolia Uniswap quote preview', {
    amountInEth: formatEther(details.amountInWei),
    quotedUsdc: formatUnits(details.quotedAmountOut, USDC_TOKEN.decimals),
    minUsdc: formatUnits(details.minAmountOut, USDC_TOKEN.decimals),
    slippageBps: details.slippageBps,
    router: details.routerAddress,
    calldataBytes: details.calldataByteLength,
  })
  return details
}
