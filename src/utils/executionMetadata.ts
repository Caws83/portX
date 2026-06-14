const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

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

function isValidCalldata(calldata: string | null | undefined): boolean {
  if (!calldata?.startsWith('0x')) return false
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

  return {
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
  }
}

/** Map backend leg execution fields; derive metadata when API omits flags */
export function executionMetadataFromApiLeg(
  leg: ApiLegExecutionFields,
  chainId: number
): QuoteExecutionMetadata {
  const transactionData = leg.transactionData ?? leg.calldata ?? null
  const transactionTo = leg.transactionTo ?? leg.routerAddress ?? null

  if (
    leg.hasExecutableCalldata != null &&
    leg.hasExactSellAmount != null &&
    leg.requiresApproval != null
  ) {
    return {
      sellAmount: leg.sellAmount ?? null,
      buyAmount: leg.buyAmount ?? null,
      spender: leg.spender ?? null,
      transactionTo,
      transactionData,
      transactionValue: leg.transactionValue ?? '0',
      gas: leg.gas ?? null,
      gasPrice: leg.gasPrice ?? null,
      tokenIn: leg.tokenIn ?? null,
      tokenOut: leg.tokenOut ?? null,
      chainId: leg.chainId ?? chainId,
      hasExecutableCalldata: leg.hasExecutableCalldata,
      hasExactSellAmount: leg.hasExactSellAmount,
      requiresApproval: leg.requiresApproval,
    }
  }

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
