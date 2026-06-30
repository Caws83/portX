import type { ExecutionPlan } from '@/types/execution'
import type { BasketQuotePreview, QuoteResponse } from '@/types/quote'
import { ENABLE_LIVE_EXECUTION, ENABLE_TESTNET_MODE } from '@/config/features'
import {
  TESTNET_MAX_BASKET_LEGS,
  TESTNET_MAX_SWAP_AMOUNT_WEI,
  TESTNET_SEPOLIA_CHAIN_ID,
  TESTNET_SWAP_ROUTER02_ADDRESS,
  TESTNET_USDC_ADDRESS,
  TESTNET_WETH_ADDRESS,
} from '@/config/testnetExecution'
import {
  buildSwapCalls,
  prepareBundleExecution,
  type BundleExecutionPrepareResult,
  type BundleExecutionValidationError,
  type ExecutionReadinessItem,
} from '@/services/bundleExecutorWrite'
import { resolveTestnetBasketToken } from '@/config/testnetBasketTokens'
import { isZeroAddress, ZERO_ADDRESS } from '@/utils/addresses'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'

export interface TestnetUniswapExecutionContext {
  enableTestnetMode?: boolean
  enableLiveExecution?: boolean
  walletConnected: boolean
  chainId?: number
  walletAddress?: string
  contractReachable: boolean
  contractReachableLoading: boolean
  /** When false, sell ERC20 legs block execute/simulation until user approves BundleExecutor */
  sellApprovalsSufficient?: boolean
}

export interface TestnetUniswapExecutionAssessment {
  isTestnetUniswapPlan: boolean
  gates: ExecutionReadinessItem[]
  prepareResult: BundleExecutionPrepareResult | null
  readyForSimulation: boolean
  canExecute: boolean
  blockedReason: string | null
}

function gate(
  id: string,
  label: string,
  passed: boolean,
  detail?: string,
): ExecutionReadinessItem {
  return { id, label, passed, detail }
}

function sumLegAmountsWei(plan: ExecutionPlan): bigint | null {
  try {
    return plan.legs.reduce((sum, leg) => sum + BigInt(leg.quote.inputAmount), 0n)
  } catch {
    return null
  }
}

function isSellBasketPlan(plan: ExecutionPlan): boolean {
  return plan.type === 'sell_basket'
}

/** SwapRouter02 for Uniswap legs; WETH9 only when quote marks a native ETH wrap leg. */
export function isAllowedTestnetLegRouter(quote: QuoteResponse): boolean {
  const router = quote.routerAddress.toLowerCase()
  const swapRouter = TESTNET_SWAP_ROUTER02_ADDRESS.toLowerCase()
  const wethRouter = TESTNET_WETH_ADDRESS.toLowerCase()

  if (quote.testnetSwap?.wethWrap === true) {
    return router === wethRouter
  }

  if (router === wethRouter) {
    return false
  }

  return router === swapRouter
}

function routerValidationError(quote: QuoteResponse, prefix: string): BundleExecutionValidationError | null {
  if (isAllowedTestnetLegRouter(quote)) {
    return null
  }

  if (quote.testnetSwap?.wethWrap === true) {
    return {
      code: 'ROUTER_NOT_ALLOWED',
      message: `WETH wrap leg must use Sepolia WETH9 (${TESTNET_WETH_ADDRESS})`,
      field: `${prefix}.quote.routerAddress`,
    }
  }

  if (quote.routerAddress.toLowerCase() === TESTNET_WETH_ADDRESS.toLowerCase()) {
    return {
      code: 'ROUTER_NOT_ALLOWED',
      message: 'WETH9 router is only allowed for marked WETH wrap legs',
      field: `${prefix}.quote.routerAddress`,
    }
  }

  return {
    code: 'ROUTER_NOT_ALLOWED',
    message: `Router must be Sepolia SwapRouter02 (${TESTNET_SWAP_ROUTER02_ADDRESS})`,
    field: `${prefix}.quote.routerAddress`,
  }
}

function validateBuyLeg(quote: QuoteResponse, prefix: string): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []
  const tokenIn =
    quote.inputToken.symbol.toUpperCase() === 'ETH' || isZeroAddress(quote.inputToken.address)
      ? ZERO_ADDRESS
      : quote.inputToken.address

  if (tokenIn !== ZERO_ADDRESS) {
    errors.push({
      code: 'TOKEN_IN_NOT_ETH',
      message: 'tokenIn must be native ETH (address zero)',
      field: `${prefix}.quote.inputToken`,
    })
  }

  if (!resolveTestnetBasketToken(quote.outputToken.symbol)) {
    errors.push({
      code: 'OUTPUT_TOKEN_UNSUPPORTED',
      message: `Output token ${quote.outputToken.symbol} is not supported on Sepolia testnet`,
      field: `${prefix}.quote.outputToken`,
    })
  }

  return errors
}

function validateSellLeg(quote: QuoteResponse, prefix: string): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []
  const inputSymbol = quote.inputToken.symbol.toUpperCase()

  if (inputSymbol === 'ETH' || isZeroAddress(quote.inputToken.address)) {
    errors.push({
      code: 'TOKEN_IN_NOT_ERC20',
      message: 'Sell leg tokenIn must be an ERC20 basket token',
      field: `${prefix}.quote.inputToken`,
    })
  } else if (!resolveTestnetBasketToken(inputSymbol)?.sellUsdcPoolFee) {
    errors.push({
      code: 'INPUT_TOKEN_UNSUPPORTED',
      message: `Input token ${quote.inputToken.symbol} is not supported for Sepolia sell`,
      field: `${prefix}.quote.inputToken`,
    })
  }

  if (quote.outputToken.symbol.toUpperCase() !== 'USDC') {
    errors.push({
      code: 'OUTPUT_NOT_USDC',
      message: 'Sell leg tokenOut must be USDC',
      field: `${prefix}.quote.outputToken`,
    })
  } else if (quote.outputToken.address.toLowerCase() !== TESTNET_USDC_ADDRESS.toLowerCase()) {
    errors.push({
      code: 'OUTPUT_NOT_USDC',
      message: `Sell leg USDC address must be ${TESTNET_USDC_ADDRESS}`,
      field: `${prefix}.quote.outputToken`,
    })
  }

  if (quote.testnetSwap?.wethWrap) {
    errors.push({
      code: 'WETH_WRAP_NOT_ALLOWED',
      message: 'WETH wrap legs are not allowed on sell plans',
      field: `${prefix}.quote.testnetSwap`,
    })
  }

  return errors
}

function validateTestnetUniswapQuoteShape(
  plan: ExecutionPlan,
): BundleExecutionValidationError[] {
  const errors: BundleExecutionValidationError[] = []
  const sellPlan = isSellBasketPlan(plan)

  if (plan.legs.length < 1 || plan.legs.length > TESTNET_MAX_BASKET_LEGS) {
    errors.push({
      code: 'LEG_COUNT_INVALID',
      message: `Testnet Uniswap execution supports 1–${TESTNET_MAX_BASKET_LEGS} legs`,
      field: 'plan.legs',
    })
    return errors
  }

  if (plan.chainId !== TESTNET_SEPOLIA_CHAIN_ID) {
    errors.push({
      code: 'QUOTE_CHAIN_MISMATCH',
      message: `Quote chainId must be Sepolia (${TESTNET_SEPOLIA_CHAIN_ID})`,
      field: 'plan.chainId',
    })
  }

  const totalAmountIn = sumLegAmountsWei(plan)
  if (totalAmountIn === null) {
    errors.push({
      code: 'INVALID_AMOUNT',
      message: 'Leg amountIn values must be valid integer strings',
      field: 'plan.legs',
    })
  } else if (totalAmountIn <= 0n) {
    errors.push({
      code: 'INVALID_AMOUNT',
      message: 'Total amountIn must be greater than zero',
      field: 'plan.legs',
    })
  } else if (!sellPlan && totalAmountIn > TESTNET_MAX_SWAP_AMOUNT_WEI) {
    errors.push({
      code: 'AMOUNT_EXCEEDS_CAP',
      message: `Total amountIn exceeds testnet cap of ${TESTNET_MAX_SWAP_AMOUNT_WEI.toString()} wei`,
      field: 'plan.legs',
    })
  }

  plan.legs.forEach((leg, index) => {
    const quote = leg.quote
    const prefix = `plan.legs[${index}]`

    if (quote.provider !== 'uniswap-sepolia') {
      errors.push({
        code: 'PROVIDER_MISMATCH',
        message: 'Quote provider must be uniswap-sepolia',
        field: `${prefix}.quote.provider`,
      })
    }

    errors.push(...(sellPlan ? validateSellLeg(quote, prefix) : validateBuyLeg(quote, prefix)))

    const routerError = routerValidationError(quote, prefix)
    if (routerError) {
      errors.push(routerError)
    }

    try {
      const amountIn = BigInt(quote.inputAmount)
      if (amountIn <= 0n) {
        errors.push({
          code: 'INVALID_AMOUNT',
          message: 'Leg amountIn must be greater than zero',
          field: `${prefix}.quote.inputAmount`,
        })
      }
    } catch {
      errors.push({
        code: 'INVALID_AMOUNT',
        message: 'Leg amountIn must be a valid integer string',
        field: `${prefix}.quote.inputAmount`,
      })
    }
  })

  return errors
}

/** Assess Sepolia Uniswap basket execution gates — no wallet writes */
export function assessTestnetUniswapBasketExecution(
  plan: ExecutionPlan,
  quotePreview: BasketQuotePreview,
  context: TestnetUniswapExecutionContext,
): TestnetUniswapExecutionAssessment {
  const isTestnetUniswapPlan = isTestnetSepoliaUniswapPlan(plan)

  if (!isTestnetUniswapPlan) {
    return {
      isTestnetUniswapPlan: false,
      gates: [],
      prepareResult: null,
      readyForSimulation: false,
      canExecute: false,
      blockedReason: null,
    }
  }

  const sellPlan = isSellBasketPlan(plan)
  const testnetMode = context.enableTestnetMode ?? ENABLE_TESTNET_MODE
  const liveExecution = context.enableLiveExecution ?? ENABLE_LIVE_EXECUTION
  const walletOnSepolia = context.chainId === TESTNET_SEPOLIA_CHAIN_ID
  const shapeErrors = validateTestnetUniswapQuoteShape(plan)
  const totalAmountIn = sumLegAmountsWei(plan)
  const allProvidersValid = plan.legs.every((leg) => leg.quote.provider === 'uniswap-sepolia')
  const sellApprovalsSufficient = sellPlan ? context.sellApprovalsSufficient !== false : true

  const prepareResult = prepareBundleExecution({
    walletConnected: context.walletConnected,
    chainId: context.chainId,
    walletAddress: context.walletAddress,
    quotePreview,
  })

  const nativeEthGatePassed = sellPlan
    ? shapeErrors.every((error) => error.code !== 'TOKEN_IN_NOT_ERC20')
    : shapeErrors.every((error) => error.code !== 'TOKEN_IN_NOT_ETH')

  const gates: ExecutionReadinessItem[] = [
    gate(
      'testnet-mode',
      'VITE_APP_MODE=testnet',
      testnetMode,
      testnetMode ? 'Testnet mode active' : 'Set VITE_APP_MODE=testnet',
    ),
    gate(
      'live-execution',
      'VITE_ENABLE_LIVE_EXECUTION=true',
      liveExecution,
      liveExecution ? 'Live execution enabled' : 'Set VITE_ENABLE_LIVE_EXECUTION=true',
    ),
    gate(
      'wallet-connected',
      'Wallet connected',
      context.walletConnected,
      context.walletConnected ? 'Connected' : 'Connect wallet',
    ),
    gate(
      'sepolia-chain',
      'Wallet on Sepolia (11155111)',
      walletOnSepolia,
      walletOnSepolia
        ? 'Sepolia'
        : context.chainId
          ? `Chain ${context.chainId} — switch to Sepolia`
          : 'Switch wallet to Sepolia',
    ),
    gate(
      'quote-chain',
      'Quote chainId is Sepolia (11155111)',
      plan.chainId === TESTNET_SEPOLIA_CHAIN_ID,
      `chainId ${plan.chainId}`,
    ),
    gate(
      'provider',
      'All legs use uniswap-sepolia',
      allProvidersValid,
      allProvidersValid ? 'uniswap-sepolia' : 'mixed or missing provider',
    ),
    gate(
      'leg-count',
      `Leg count within 1–${TESTNET_MAX_BASKET_LEGS}`,
      plan.legs.length >= 1 && plan.legs.length <= TESTNET_MAX_BASKET_LEGS,
      `${plan.legs.length} leg(s)`,
    ),
    gate(
      sellPlan ? 'erc20-input' : 'native-eth',
      sellPlan ? 'All legs use ERC20 basket token input' : 'All legs use native ETH input',
      nativeEthGatePassed,
      sellPlan ? 'LINK / UNI / WETH / AAVE' : 'ETH / address(0)',
    ),
    gate(
      'swap-router',
      'Leg routers allowed (SwapRouter02 or WETH wrap)',
      shapeErrors.every((error) => error.code !== 'ROUTER_NOT_ALLOWED'),
      sellPlan
        ? `SwapRouter02 ${TESTNET_SWAP_ROUTER02_ADDRESS}`
        : `SwapRouter02 ${TESTNET_SWAP_ROUTER02_ADDRESS} · WETH9 wrap ${TESTNET_WETH_ADDRESS}`,
    ),
    gate(
      sellPlan ? 'usdc-output' : 'output-token',
      sellPlan ? 'All legs output USDC' : 'Output tokens supported on Sepolia',
      sellPlan
        ? shapeErrors.every((error) => error.code !== 'OUTPUT_NOT_USDC')
        : shapeErrors.every((error) => error.code !== 'OUTPUT_TOKEN_UNSUPPORTED'),
      sellPlan ? TESTNET_USDC_ADDRESS : 'Basket tokens',
    ),
    gate(
      'amount-cap',
      sellPlan ? 'All leg amounts valid' : 'Total amountIn within testnet cap',
      shapeErrors.every(
        (error) => error.code !== 'AMOUNT_EXCEEDS_CAP' && error.code !== 'INVALID_AMOUNT',
      ),
      totalAmountIn !== null ? `${totalAmountIn.toString()} wei total` : 'missing',
    ),
    gate(
      'not-demo',
      'Plan is not demo',
      !plan.isDemo,
      plan.isDemo ? 'Demo plan' : 'Live testnet quote',
    ),
    gate(
      'bundle-prepare',
      'BundleExecutor payload valid',
      prepareResult.status === 'ready',
      prepareResult.status === 'validation_errors'
        ? prepareResult.errors[0]?.message ?? 'Validation failed'
        : 'Ready',
    ),
    gate(
      'contract-reachable',
      'BundleExecutor reachable',
      context.contractReachable,
      context.contractReachableLoading
        ? 'Checking…'
        : context.contractReachable
          ? 'Reachable on Sepolia'
          : 'Contract not reachable on Sepolia',
    ),
  ]

  if (sellPlan) {
    gates.push(
      gate(
        'zero-msg-value',
        'msg.value = 0 (ERC20 sell)',
        prepareResult.status === 'ready' && prepareResult.totalNativeEthWei === 0n,
        prepareResult.status === 'ready'
          ? `${prepareResult.totalNativeEthWei.toString()} wei`
          : 'Pending payload',
      ),
      gate(
        'bundle-approvals',
        'Portfolio token + USDC fee approvals',
        sellApprovalsSufficient,
        sellApprovalsSufficient
          ? 'All allowances sufficient'
          : 'Approve portfolio tokens and USDC protocol fee before execute',
      ),
    )
  }

  if (shapeErrors.length > 0) {
    const shapeGate = shapeErrors[0]
    const existing = gates.find((item) => item.id === 'bundle-prepare')
    if (existing && existing.passed) {
      existing.passed = false
      existing.detail = shapeGate.message
    }
  }

  const failedGate = gates.find((item) => !item.passed)
  const readyForSimulation = !failedGate && prepareResult.status === 'ready'

  return {
    isTestnetUniswapPlan: true,
    gates,
    prepareResult,
    readyForSimulation,
    canExecute: false,
    blockedReason: failedGate ? failedGate.detail ?? failedGate.label : null,
  }
}

export function finalizeTestnetExecutionAssessment(
  assessment: TestnetUniswapExecutionAssessment,
  simulation: { passed: boolean; message: string } | null,
  simulating: boolean,
): TestnetUniswapExecutionAssessment {
  if (!assessment.isTestnetUniswapPlan) return assessment

  const simulationGate = gate(
    'static-simulation',
    'Static simulation passes',
    simulation?.passed === true,
    simulating
      ? 'Simulating…'
      : simulation
        ? simulation.message
        : 'Not simulated',
  )

  const gates = [...assessment.gates, simulationGate]
  const failedGate = gates.find((item) => !item.passed)

  return {
    ...assessment,
    gates,
    canExecute: !failedGate && !simulating,
    blockedReason: failedGate ? failedGate.detail ?? failedGate.label : null,
  }
}

/** Build swap calls for a validated testnet plan — convenience wrapper */
export function buildTestnetSwapCallsFromPreview(
  quotePreview: BasketQuotePreview,
): BundleExecutionPrepareResult {
  return buildSwapCalls(quotePreview)
}
