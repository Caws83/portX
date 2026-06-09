import type { BasketQuotePreview } from '@/types/quote'
import type { QuoteResponse } from '@/types/quote'
import { BUNDLE_EXECUTOR_SEPOLIA } from '@/config/contracts'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import {
  getBundleExecutorAddress,
  getBundleExecutorChainId,
} from '@/services/bundleExecutorContract'
import { isValidCalldata, isValidRouterAddress } from '@/services/transactionBuilder'
import { isZeroAddress, ZERO_ADDRESS } from '@/utils/addresses'

/** Matches BundleExecutor.SwapCall — encode-only; no on-chain writes in Phase B */
export interface BundleSwapCall {
  router: `0x${string}`
  data: `0x${string}`
  tokenIn: `0x${string}`
  amountIn: bigint
  minAmountOut: bigint
  tokenOut: `0x${string}`
}

export interface BundleExecutionContext {
  walletConnected: boolean
  chainId?: number
  walletAddress?: string
  quotePreview?: BasketQuotePreview | null
}

export interface BundleExecutionValidationError {
  code: string
  message: string
  field?: string
}

export interface BundleExecutionReady {
  status: 'ready'
  contractAddress: `0x${string}`
  chainId: number
  basketId: `0x${string}`
  swapCalls: BundleSwapCall[]
  legCount: number
  totalNativeEthWei: bigint
}

export interface BundleExecutionValidationErrors {
  status: 'validation_errors'
  errors: BundleExecutionValidationError[]
}

export type BundleExecutionPrepareResult = BundleExecutionReady | BundleExecutionValidationErrors

export interface ExecutionReadinessItem {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export interface TestnetExecutionReadiness {
  items: ExecutionReadinessItem[]
  executionLabel: 'Execution Disabled (Alpha)'
  prepareResult: BundleExecutionPrepareResult
}

export const EXECUTION_DISABLED_ALPHA_LABEL = 'Execution Disabled (Alpha)' as const

const SEPOLIA_CHAIN_ID = getBundleExecutorChainId()
const MAINNET_CHAIN_ID = 1

function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

function parsePositiveBigInt(value: string, field: string): bigint | BundleExecutionValidationError {
  try {
    const parsed = BigInt(value)
    if (parsed <= 0n) {
      return { code: 'INVALID_AMOUNT', message: `${field} must be greater than zero`, field }
    }
    return parsed
  } catch {
    return { code: 'INVALID_AMOUNT', message: `${field} must be a valid integer string`, field }
  }
}

function resolveTokenAddress(token: QuoteResponse['inputToken'] | QuoteResponse['outputToken']): `0x${string}` {
  const symbol = token.symbol.toUpperCase()
  if (symbol === 'ETH' || isZeroAddress(token.address)) {
    return ZERO_ADDRESS as `0x${string}`
  }
  return token.address as `0x${string}`
}

function computeMinAmountOut(outputAmount: string, slippageBps: number): bigint | BundleExecutionValidationError {
  const parsed = parsePositiveBigInt(outputAmount, 'outputAmount')
  if (typeof parsed !== 'bigint') return parsed
  const numerator = parsed * BigInt(10_000 - slippageBps)
  return numerator / 10_000n
}

function validateSwapCallShape(swapCall: BundleSwapCall, legIndex: number): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []
  const prefix = `legs[${legIndex}]`

  if (!isValidRouterAddress(swapCall.router)) {
    errors.push({ code: 'INVALID_SWAP_CALL', message: 'router must be a non-zero address', field: `${prefix}.router` })
  }
  if (!isValidCalldata(swapCall.data)) {
    errors.push({ code: 'INVALID_SWAP_CALL', message: 'data must be valid hex calldata', field: `${prefix}.data` })
  }
  if (!isValidAddress(swapCall.tokenIn) && swapCall.tokenIn !== ZERO_ADDRESS) {
    errors.push({ code: 'INVALID_SWAP_CALL', message: 'tokenIn must be a valid address', field: `${prefix}.tokenIn` })
  }
  if (!isValidAddress(swapCall.tokenOut) || isZeroAddress(swapCall.tokenOut)) {
    errors.push({ code: 'INVALID_SWAP_CALL', message: 'tokenOut must be a non-zero address', field: `${prefix}.tokenOut` })
  }
  if (swapCall.amountIn <= 0n) {
    errors.push({ code: 'INVALID_SWAP_CALL', message: 'amountIn must be greater than zero', field: `${prefix}.amountIn` })
  }
  if (swapCall.minAmountOut < 0n) {
    errors.push({ code: 'INVALID_SWAP_CALL', message: 'minAmountOut must be non-negative', field: `${prefix}.minAmountOut` })
  }

  return errors
}

function validateQuoteStructure(quote: QuoteResponse, legIndex: number): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []
  const prefix = `legs[${legIndex}].bestQuote`

  if (quote.provider === 'unsupported') {
    errors.push({ code: 'UNSUPPORTED_QUOTE', message: 'Quote provider is unsupported', field: prefix })
  }
  if (!isValidRouterAddress(quote.routerAddress)) {
    errors.push({ code: 'INVALID_QUOTE', message: 'routerAddress is missing or invalid', field: `${prefix}.routerAddress` })
  }
  if (!isValidCalldata(quote.calldata)) {
    errors.push({ code: 'INVALID_QUOTE', message: 'calldata is missing or invalid', field: `${prefix}.calldata` })
  }
  if (!isValidAddress(quote.inputToken.address) && quote.inputToken.symbol.toUpperCase() !== 'ETH') {
    errors.push({ code: 'INVALID_QUOTE', message: 'inputToken address is invalid', field: `${prefix}.inputToken` })
  }
  if (!isValidAddress(quote.outputToken.address) || isZeroAddress(quote.outputToken.address)) {
    errors.push({ code: 'INVALID_QUOTE', message: 'outputToken address is invalid', field: `${prefix}.outputToken` })
  }

  const amountIn = parsePositiveBigInt(quote.inputAmount, `${prefix}.inputAmount`)
  if (typeof amountIn !== 'bigint') errors.push(amountIn)

  const outputAmount = parsePositiveBigInt(quote.outputAmount, `${prefix}.outputAmount`)
  if (typeof outputAmount !== 'bigint') errors.push(outputAmount)

  return errors
}

function validateContractAddress(contractAddress?: string): BundleExecutionValidationError[] {
  const expected = getBundleExecutorAddress()
  if (!contractAddress) {
    return [{ code: 'CONTRACT_NOT_CONFIGURED', message: 'BundleExecutor address is not configured' }]
  }
  if (!isValidAddress(contractAddress)) {
    return [{ code: 'INVALID_CONTRACT', message: 'BundleExecutor address format is invalid', field: 'contractAddress' }]
  }
  if (contractAddress.toLowerCase() !== expected.toLowerCase()) {
    return [{
      code: 'CONTRACT_MISMATCH',
      message: `Contract address must be Sepolia BundleExecutor (${expected})`,
      field: 'contractAddress',
    }]
  }
  return []
}

function validateChain(chainId?: number): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []

  if (chainId === undefined) {
    errors.push({ code: 'CHAIN_MISSING', message: 'Wallet chain ID is not available', field: 'chainId' })
    return errors
  }
  if (chainId === MAINNET_CHAIN_ID) {
    errors.push({ code: 'MAINNET_BLOCKED', message: 'Mainnet execution is not allowed', field: 'chainId' })
  }
  if (chainId !== SEPOLIA_CHAIN_ID) {
    errors.push({
      code: 'WRONG_CHAIN',
      message: `Chain must be Sepolia (${SEPOLIA_CHAIN_ID})`,
      field: 'chainId',
    })
  }

  return errors
}

/** Validate execution context, chain, contract, and optional quote structure — no wallet or RPC calls */
export function validateBundleExecution(context: BundleExecutionContext): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []

  errors.push(...validateContractAddress(getBundleExecutorAddress()))

  if (!BUNDLE_EXECUTOR_SEPOLIA.verified) {
    errors.push({ code: 'CONTRACT_UNVERIFIED', message: 'BundleExecutor is not marked verified in config' })
  }

  errors.push(...validateChain(context.chainId))

  if (!context.walletConnected) {
    errors.push({ code: 'WALLET_DISCONNECTED', message: 'Wallet is not connected', field: 'walletConnected' })
  }

  if (context.walletAddress && !isValidAddress(context.walletAddress)) {
    errors.push({ code: 'INVALID_WALLET', message: 'Wallet address format is invalid', field: 'walletAddress' })
  }

  if (!ENABLE_TESTNET_MODE) {
    errors.push({
      code: 'TESTNET_MODE_REQUIRED',
      message: 'VITE_APP_MODE must be testnet for testnet execution',
      field: 'appMode',
    })
  }

  if (!ENABLE_LIVE_EXECUTION) {
    errors.push({
      code: 'LIVE_EXECUTION_DISABLED',
      message: 'Live execution is disabled (Alpha) — validation scaffold only',
      field: 'liveExecution',
    })
  }

  const preview = context.quotePreview
  if (!preview) {
    errors.push({ code: 'QUOTE_MISSING', message: 'Basket quote preview is required', field: 'quotePreview' })
    return errors
  }

  errors.push(...validateQuotePreviewStructure(preview))

  return errors
}

function deriveBasketId(preview: BasketQuotePreview): `0x${string}` {
  const seed = preview.basketId ?? preview.basketName ?? String(preview.createdAt)
  let hex = ''
  for (let i = 0; i < seed.length && hex.length < 64; i++) {
    hex += seed.charCodeAt(i).toString(16).padStart(2, '0')
  }
  return `0x${hex.padEnd(64, '0').slice(0, 64)}` as `0x${string}`
}

function validateQuotePreviewStructure(preview: BasketQuotePreview): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []

  if (preview.isDemo) {
    errors.push({ code: 'DEMO_QUOTE', message: 'Demo quotes cannot be used for bundle execution', field: 'quotePreview' })
  }
  if (preview.chainId !== SEPOLIA_CHAIN_ID) {
    errors.push({
      code: 'QUOTE_CHAIN_MISMATCH',
      message: `Quote chainId must be Sepolia (${SEPOLIA_CHAIN_ID})`,
      field: 'quotePreview.chainId',
    })
  }
  if (preview.legs.length === 0) {
    errors.push({ code: 'EMPTY_BASKET', message: 'Quote preview must include at least one leg', field: 'quotePreview.legs' })
  }
  preview.legs.forEach((leg, index) => {
    errors.push(...validateQuoteStructure(leg.bestQuote, index))
  })

  return errors
}

/** Build in-memory SwapCall[] from quote preview — validates quote structure and SwapCall shape only */
export function buildSwapCalls(preview: BasketQuotePreview): BundleExecutionPrepareResult {
  const quoteErrors = validateQuotePreviewStructure(preview)
  if (quoteErrors.length > 0) {
    return { status: 'validation_errors', errors: quoteErrors }
  }

  const swapCalls: BundleSwapCall[] = []
  const shapeErrors: BundleExecutionValidationError[] = []

  for (const [index, leg] of preview.legs.entries()) {
    const quote = leg.bestQuote
    const amountIn = parsePositiveBigInt(quote.inputAmount, `legs[${index}].inputAmount`)
    if (typeof amountIn !== 'bigint') {
      shapeErrors.push(amountIn)
      continue
    }

    const minAmountOut = computeMinAmountOut(quote.outputAmount, preview.slippageBps)
    if (typeof minAmountOut !== 'bigint') {
      shapeErrors.push(minAmountOut)
      continue
    }

    const swapCall: BundleSwapCall = {
      router: quote.routerAddress as `0x${string}`,
      data: quote.calldata as `0x${string}`,
      tokenIn: resolveTokenAddress(quote.inputToken),
      amountIn,
      minAmountOut,
      tokenOut: quote.outputToken.address as `0x${string}`,
    }

    shapeErrors.push(...validateSwapCallShape(swapCall, index))
    swapCalls.push(swapCall)
  }

  if (shapeErrors.length > 0) {
    return { status: 'validation_errors', errors: shapeErrors }
  }

  const basketId = deriveBasketId(preview)
  const totalNativeEthWei = swapCalls.reduce(
    (sum, call) => (call.tokenIn === ZERO_ADDRESS ? sum + call.amountIn : sum),
    0n,
  )

  return {
    status: 'ready',
    contractAddress: getBundleExecutorAddress(),
    chainId: SEPOLIA_CHAIN_ID,
    basketId,
    swapCalls,
    legCount: swapCalls.length,
    totalNativeEthWei,
  }
}

/** Validate context and optionally build SwapCall[] — returns ready or validation errors; never sends transactions */
export function prepareBundleExecution(context: BundleExecutionContext): BundleExecutionPrepareResult {
  const errors = validateBundleExecution(context)
  if (errors.length > 0) {
    return { status: 'validation_errors', errors }
  }

  return buildSwapCalls(context.quotePreview!)
}

function isSwapCallBuilderAvailable(): boolean {
  return typeof buildSwapCalls === 'function'
}

/** Settings-facing readiness checklist — scaffold only; execution always disabled in Alpha */
export function getTestnetExecutionReadiness(context: BundleExecutionContext): TestnetExecutionReadiness {
  const contractConfigured =
    isValidAddress(BUNDLE_EXECUTOR_SEPOLIA.address) &&
    validateContractAddress(getBundleExecutorAddress()).length === 0

  const walletConnected = context.walletConnected
  const correctNetwork = context.chainId === SEPOLIA_CHAIN_ID
  const quoteAvailable =
    !!context.quotePreview &&
    context.quotePreview.legs.length > 0 &&
    validateQuoteStructure(context.quotePreview.legs[0].bestQuote, 0).length === 0

  const swapCallBuilderAvailable = isSwapCallBuilderAvailable()

  const items: ExecutionReadinessItem[] = [
    {
      id: 'contract-configured',
      label: 'Contract configured',
      passed: contractConfigured,
      detail: contractConfigured ? BUNDLE_EXECUTOR_SEPOLIA.address : 'Sepolia BundleExecutor missing',
    },
    {
      id: 'wallet-connected',
      label: 'Wallet connected',
      passed: walletConnected,
      detail: walletConnected ? 'Connected' : 'Connect wallet to continue',
    },
    {
      id: 'correct-network',
      label: 'Correct network',
      passed: correctNetwork,
      detail: correctNetwork
        ? 'Sepolia'
        : context.chainId
          ? `Chain ${context.chainId} — switch to Sepolia`
          : 'Switch wallet to Sepolia',
    },
    {
      id: 'quote-available',
      label: 'Quote available',
      passed: quoteAvailable,
      detail: quoteAvailable
        ? `${context.quotePreview!.legs.length} leg(s) validated`
        : 'No basket quote loaded in Settings',
    },
    {
      id: 'swapcall-builder',
      label: 'SwapCall builder available',
      passed: swapCallBuilderAvailable,
      detail: swapCallBuilderAvailable ? 'buildSwapCalls() scaffold ready' : 'Builder unavailable',
    },
  ]

  return {
    items,
    executionLabel: EXECUTION_DISABLED_ALPHA_LABEL,
    prepareResult: prepareBundleExecution(context),
  }
}
