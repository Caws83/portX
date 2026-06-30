import {
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  type Address,
  type Hex,
} from 'viem'

import {
  getBundleExecutorAddress,
  getChainById,
} from '@/config/chainsRegistry'

export interface BatchApprovalLegDef {
  id: string
  tokenAddress: Address
  approvalAmount: bigint
}

/** wallet_sendCalls call object for a single ERC-20 approve. */
export interface BatchApprovalCall {
  to: Address
  data: Hex
  chainId: number
}

export interface BuildExactApprovalCallsParams {
  legs: readonly BatchApprovalLegDef[]
  chainId: number
  spender?: Address
  /** Max approval is only used when explicitly true — exact amount is the default. */
  preferMaxApproval?: boolean
}

export function resolveBatchApprovalAmount(
  leg: Pick<BatchApprovalLegDef, 'approvalAmount'>,
  preferMaxApproval: boolean,
): bigint {
  return preferMaxApproval === true ? maxUint256 : leg.approvalAmount
}

export function encodeErc20ApproveCalldata(
  spender: Address,
  amount: bigint,
): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
  })
}

/**
 * Build exact (or optional max) ERC-20 approve call objects for EIP-5792 batching.
 * Chain and spender resolve from chainsRegistry — no hardcoded network IDs.
 */
export function buildExactApprovalCalls(
  params: BuildExactApprovalCallsParams,
): BatchApprovalCall[] {
  const { legs, chainId, preferMaxApproval = false } = params
  const chain = getChainById(chainId)
  if (!chain) {
    throw new Error(`Chain ${chainId} is not registered for batch approvals.`)
  }

  const spender =
    params.spender ?? getBundleExecutorAddress(chainId) ?? undefined
  if (!spender) {
    throw new Error(`No bundle executor configured for chain ${chain.name}.`)
  }

  return legs.map((leg) => {
    const amount = resolveBatchApprovalAmount(leg, preferMaxApproval)
    return {
      to: leg.tokenAddress,
      data: encodeErc20ApproveCalldata(spender, amount),
      chainId: chain.chainId,
    }
  })
}
