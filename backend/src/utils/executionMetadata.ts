const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

const DEMO_CALLDATA_MARKERS = ['_DEMO_CALLDATA', '_DEMO_']

export interface LegExecutionMetadata {
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

export function emptyExecutionMetadata(chainId?: number): LegExecutionMetadata {
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

export function buildExecutionMetadata(params: {
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
}): LegExecutionMetadata {
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

  return finalizeExecutionMetadata({
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
export function finalizeExecutionMetadata(meta: LegExecutionMetadata): LegExecutionMetadata {
  const hasExecutableCalldata =
    meta.hasExecutableCalldata &&
    isValidCalldata(meta.transactionData) &&
    isValidHexAddress(meta.transactionTo)

  return {
    ...meta,
    transactionData: hasExecutableCalldata ? meta.transactionData : null,
    transactionTo: hasExecutableCalldata ? meta.transactionTo : isValidHexAddress(meta.transactionTo)
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
