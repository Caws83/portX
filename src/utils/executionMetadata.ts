const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

const DEMO_CALLDATA_MARKERS = ['_DEMO_CALLDATA', '_DEMO_']

export interface QuoteExecutionMetadata {
  sellAmount: string | null
  buyAmount: string | null
  spender: string | null
  transactionTo: string | null
  transactionData: string | null
  transactionValue: string | null
  gas: string | null
  gasPrice: string | null
  tokenIn: string | null
  tokenOut: string | null
  chainId: number | null
  hasExecutableCalldata: boolean
  hasExactSellAmount: boolean
  requiresApproval: boolean
}

/** API leg fields shared across buy/sell quote responses */
export interface ApiLegExecutionFields {
  sellAmount?: string | null
  buyAmount?: string | null
  spender?: string | null
  transactionTo?: string | null
  transactionData?: string | null
  transactionValue?: string | null
  gas?: string | null
  gasPrice?: string | null
  tokenIn?: string | null
  tokenOut?: string | null
  chainId?: number | null
  hasExecutableCalldata?: boolean
  hasExactSellAmount?: boolean
  requiresApproval?: boolean
  calldata?: string | null
  routerAddress?: string | null
}

function isValidHexAddress(address: string | null | undefined): boolean {
  return Boolean(address && /^0x[0-9a-fA-F]{40}$/.test(address))
}

function isNativeTokenAddress(address: string | null | undefined): boolean {
  if (!address) return false
  return address.toLowerCase() === NATIVE_ETH_ADDRESS
}

export function isValidCalldata(calldata: string | null | undefined): boolean {
  if (!calldata?.startsWith('0x')) return false
  if (DEMO_CALLDATA_MARKERS.some((marker) => calldata.includes(marker))) return false
  const body = calldata.slice(2)
  return body.length >= 16 && /^[0-9a-fA-F]+$/.test(body) && !/^0+$/.test(body)
}

export function emptyQuoteExecutionMetadata(chainId?: number): QuoteExecutionMetadata {
  return {
    sellAmount: null,
    buyAmount: null,
    spender: null,
    transactionTo: null,
    transactionData: null,
    transactionValue: null,
    gas: null,
    gasPrice: null,
    tokenIn: null,
    tokenOut: null,
    chainId: chainId ?? null,
    hasExecutableCalldata: false,
    hasExactSellAmount: false,
    requiresApproval: false,
  }
}

export function buildQuoteExecutionMetadata(params: {
  chainId: number
  sellAmount?: string | null
  buyAmount?: string | null
  spender?: string | null
  transactionTo?: string | null
  transactionData?: string | null
  transactionValue?: string | null
  gas?: string | null
  gasPrice?: string | null
  tokenIn?: string | null
  tokenOut?: string | null
}): QuoteExecutionMetadata {
  const sellAmount = params.sellAmount ?? null
  const buyAmount = params.buyAmount ?? null
  const spender = params.spender ?? null
  const transactionTo = params.transactionTo ?? null
  const transactionData = params.transactionData ?? null
  const transactionValue = params.transactionValue ?? '0'
  const tokenIn = params.tokenIn ?? null

  const hasExactSellAmount = Boolean(sellAmount && sellAmount !== '0')
  const hasExecutableCalldata =
    isValidCalldata(transactionData) && isValidHexAddress(transactionTo)
  const requiresApproval =
    hasExactSellAmount &&
    isValidHexAddress(spender) &&
    !isNativeTokenAddress(tokenIn)

  return finalizeQuoteExecutionMetadata({
    sellAmount,
    buyAmount,
    spender: isValidHexAddress(spender) ? spender : null,
    transactionTo: isValidHexAddress(transactionTo) ? transactionTo : null,
    transactionData: hasExecutableCalldata ? transactionData! : null,
    transactionValue: transactionValue ?? '0',
    gas: params.gas ?? null,
    gasPrice: params.gasPrice ?? null,
    tokenIn,
    tokenOut: params.tokenOut ?? null,
    chainId: params.chainId,
    hasExecutableCalldata,
    hasExactSellAmount,
    requiresApproval,
  })
}

/** Guard: never mark a leg executable without valid transaction.to and transaction.data */
export function finalizeQuoteExecutionMetadata(
  meta: QuoteExecutionMetadata
): QuoteExecutionMetadata {
  const hasExecutableCalldata =
    meta.hasExecutableCalldata &&
    isValidCalldata(meta.transactionData) &&
    isValidHexAddress(meta.transactionTo)

  return {
    ...meta,
    transactionData: hasExecutableCalldata ? meta.transactionData : null,
    transactionTo: hasExecutableCalldata
      ? meta.transactionTo
      : isValidHexAddress(meta.transactionTo)
        ? meta.transactionTo
        : null,
    hasExecutableCalldata,
    hasExactSellAmount: hasExecutableCalldata && meta.hasExactSellAmount,
    requiresApproval:
      hasExecutableCalldata &&
      meta.hasExactSellAmount &&
      meta.requiresApproval &&
      isValidHexAddress(meta.spender),
    spender: isValidHexAddress(meta.spender) ? meta.spender : null,
  }
}

/** Map backend leg execution fields; always re-validate from payload fields */
export function executionMetadataFromApiLeg(
  leg: ApiLegExecutionFields,
  chainId: number
): QuoteExecutionMetadata {
  const transactionData = leg.transactionData ?? leg.calldata ?? null
  const transactionTo = leg.transactionTo ?? leg.routerAddress ?? null

  return buildQuoteExecutionMetadata({
    chainId: leg.chainId ?? chainId,
    sellAmount: leg.sellAmount,
    buyAmount: leg.buyAmount,
    spender: leg.spender,
    transactionTo,
    transactionData,
    transactionValue: leg.transactionValue,
    gas: leg.gas,
    gasPrice: leg.gasPrice,
    tokenIn: leg.tokenIn,
    tokenOut: leg.tokenOut,
  })
}

export function isLiveZeroXExecutionMetadata(meta: QuoteExecutionMetadata): boolean {
  return meta.hasExecutableCalldata && meta.hasExactSellAmount
}

/** Fallback USD-derived input amount when API does not provide exact sellAmount */
export function usdDerivedInputAmount(inputAmountUsd: number, decimals: number): string {
  return String(Math.round(inputAmountUsd * Math.pow(10, decimals)))
}

export function parseGasUnits(gas: string | null | undefined, estimatedGasUsd: number): number {
  if (gas) {
    const parsed = parseInt(gas, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return Math.round(estimatedGasUsd * 1e9)
}

export function truncateExecutionAddress(address: string | null, head = 6, tail = 4): string {
  if (!address) return 'Not available'
  if (address.length <= head + tail + 2) return address
  return `${address.slice(0, head + 2)}…${address.slice(-tail)}`
}
