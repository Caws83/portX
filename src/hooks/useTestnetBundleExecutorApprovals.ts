import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import type { Address, PublicClient } from 'viem'
import { erc20Abi, formatUnits, maxUint256 } from 'viem'
import { sepolia } from 'viem/chains'
import { wagmiConfig } from '@/config/wagmi'
import { TESTNET_SEPOLIA_CHAIN_ID, TESTNET_USDC_ADDRESS } from '@/config/testnetExecution'
import { getBundleExecutorAddress, type BundleExecutorFeeConfig } from '@/services/bundleExecutorContract'
import { estimateSellProtocolFee } from '@/services/protocolFee'
import type { ExecutionPlan } from '@/types/execution'
import { isZeroAddress } from '@/utils/addresses'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'

export const USDC_PROTOCOL_FEE_APPROVAL_ID = 'usdc-protocol-fee'

export type TestnetApprovalStatus = 'approved' | 'needs_approval' | 'pending'

export interface TestnetApprovalRequirement {
  id: string
  symbol: string
  tokenAddress: Address
  amountRequired: bigint
  amountDisplay: string
  allowance: bigint
  sufficient: boolean
  kind: 'input' | 'protocol_fee'
  status: TestnetApprovalStatus
}

export interface UseTestnetBundleExecutorApprovalsResult {
  requiresApprovals: boolean
  legs: TestnetApprovalRequirement[]
  inputLegs: TestnetApprovalRequirement[]
  protocolFeeLeg: TestnetApprovalRequirement | null
  allApprovalsSufficient: boolean
  portfolioApprovalsSufficient: boolean
  missingUsdcFeeApproval: boolean
  missingInputApprovals: TestnetApprovalRequirement[]
  pendingSymbol: string | null
  isApproving: boolean
  approvalError: string | null
  refetchAllowances: () => Promise<void>
  approveToken: (symbolOrId: string) => Promise<void>
  approveMissingPortfolioTokens: () => Promise<void>
  approveAllMissing: () => Promise<void>
}

function isErc20SellLeg(leg: ExecutionPlan['legs'][number]): boolean {
  const symbol = leg.quote.inputToken.symbol.toUpperCase()
  if (symbol === 'ETH') return false
  if (isZeroAddress(leg.quote.inputToken.address)) return false
  return true
}

function buildInputApprovalLegs(
  plan: ExecutionPlan,
): Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient' | 'status'>[] {
  const byToken = new Map<
    string,
    Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient' | 'status'>
  >()

  for (const leg of plan.legs) {
    if (!isErc20SellLeg(leg)) continue

    const symbol = leg.quote.inputToken.symbol.toUpperCase()
    const amountRequired = BigInt(leg.quote.inputAmount)
    const existing = byToken.get(symbol)

    if (existing) {
      const combined = existing.amountRequired + amountRequired
      byToken.set(symbol, {
        ...existing,
        amountRequired: combined,
        amountDisplay: formatUnits(combined, leg.quote.inputToken.decimals),
      })
      continue
    }

    byToken.set(symbol, {
      id: `input-${symbol.toLowerCase()}`,
      symbol: leg.quote.inputToken.symbol,
      tokenAddress: leg.quote.inputToken.address as Address,
      amountRequired,
      amountDisplay: formatUnits(amountRequired, leg.quote.inputToken.decimals),
      kind: 'input',
    })
  }

  return [...byToken.values()]
}

function buildSellFeeApprovalLeg(
  plan: ExecutionPlan,
  feeConfig: BundleExecutorFeeConfig | null,
): Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient' | 'status'> | null {
  if (plan.type !== 'sell_basket') return null
  if (!feeConfig?.feesEnabled || feeConfig.sellFeeBps <= 0) return null

  const totalOutputWei = plan.legs.reduce(
    (sum, leg) => sum + BigInt(leg.quote.outputAmount),
    0n,
  )
  const feeAmount = estimateSellProtocolFee(totalOutputWei, feeConfig)
  if (feeAmount <= 0n) return null

  const outputToken = plan.legs[0]?.quote.outputToken
  if (!outputToken || isZeroAddress(outputToken.address)) return null
  if (outputToken.address.toLowerCase() !== TESTNET_USDC_ADDRESS.toLowerCase()) return null

  return {
    id: USDC_PROTOCOL_FEE_APPROVAL_ID,
    symbol: 'USDC',
    tokenAddress: outputToken.address as Address,
    amountRequired: feeAmount,
    amountDisplay: formatUnits(feeAmount, outputToken.decimals),
    kind: 'protocol_fee',
  }
}

export function mergeSellApprovalLegDefs(
  plan: ExecutionPlan,
  feeConfig: BundleExecutorFeeConfig | null,
): Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient' | 'status'>[] {
  const legs = buildInputApprovalLegs(plan)
  const feeLeg = buildSellFeeApprovalLeg(plan, feeConfig)
  if (!feeLeg) return legs
  return [...legs, feeLeg]
}

async function readAllowances(
  publicClient: PublicClient,
  owner: Address,
  legs: Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient' | 'status'>[],
  pendingSymbol: string | null,
): Promise<TestnetApprovalRequirement[]> {
  const spender = getBundleExecutorAddress()

  return Promise.all(
    legs.map(async (leg) => {
      const allowance = await publicClient.readContract({
        address: leg.tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      })

      const sufficient = allowance >= leg.amountRequired
      const status: TestnetApprovalStatus = pendingSymbol === leg.symbol
        ? 'pending'
        : sufficient
          ? 'approved'
          : 'needs_approval'

      return {
        ...leg,
        allowance,
        sufficient,
        status,
      }
    }),
  )
}

function findApprovalLeg(
  legs: TestnetApprovalRequirement[],
  symbolOrId: string,
): TestnetApprovalRequirement | undefined {
  const normalized = symbolOrId.toLowerCase()
  return legs.find(
    (item) =>
      item.id.toLowerCase() === normalized ||
      item.symbol.toLowerCase() === normalized ||
      item.tokenAddress.toLowerCase() === normalized,
  )
}

export async function verifyTestnetSellApprovals(params: {
  plan: ExecutionPlan
  feeConfig: BundleExecutorFeeConfig | null
  owner: Address
  publicClient: PublicClient
}): Promise<{ sufficient: boolean; missingUsdcFee: boolean; legs: TestnetApprovalRequirement[] }> {
  const defs = mergeSellApprovalLegDefs(params.plan, params.feeConfig)
  if (defs.length === 0) {
    return { sufficient: true, missingUsdcFee: false, legs: [] }
  }

  const legs = await readAllowances(params.publicClient, params.owner, defs, null)
  const protocolFeeLeg = legs.find((leg) => leg.kind === 'protocol_fee') ?? null
  return {
    sufficient: legs.every((leg) => leg.sufficient),
    missingUsdcFee: protocolFeeLeg != null && !protocolFeeLeg.sufficient,
    legs,
  }
}

export interface UseTestnetBundleExecutorApprovalsOptions {
  onApprovalSuccess?: () => void | Promise<void>
}

export function useTestnetBundleExecutorApprovals(
  plan: ExecutionPlan | null,
  open: boolean,
  feeConfig: BundleExecutorFeeConfig | null = null,
  options: UseTestnetBundleExecutorApprovalsOptions = {},
): UseTestnetBundleExecutorApprovalsResult {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: TESTNET_SEPOLIA_CHAIN_ID })
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()

  const [legs, setLegs] = useState<TestnetApprovalRequirement[]>([])
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const requiresApprovals = useMemo(() => {
    if (!plan || !open || plan.type !== 'sell_basket' || !isTestnetSepoliaUniswapPlan(plan)) {
      return false
    }
    return mergeSellApprovalLegDefs(plan, feeConfig).length > 0
  }, [plan, open, feeConfig])

  const approvalLegDefs = useMemo(() => {
    if (!requiresApprovals || !plan) return []
    return mergeSellApprovalLegDefs(plan, feeConfig)
  }, [requiresApprovals, plan, feeConfig])

  const refetchAllowances = useCallback(async () => {
    if (!requiresApprovals || !address || !publicClient || approvalLegDefs.length === 0) {
      setLegs([])
      return
    }

    const next = await readAllowances(publicClient, address, approvalLegDefs, pendingSymbol)
    setLegs(next)
  }, [requiresApprovals, address, publicClient, approvalLegDefs, pendingSymbol])

  useEffect(() => {
    if (!open) {
      setLegs([])
      return
    }
    void refetchAllowances()
  }, [open, refetchAllowances, refreshNonce])

  const submitApproval = useCallback(
    async (leg: Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient' | 'status'>) => {
      if (!address || !publicClient) {
        setApprovalError('Connect wallet on Sepolia to approve tokens')
        return false
      }

      setPendingSymbol(leg.symbol)
      setApprovalError(null)

      try {
        const hash = await writeContractAsync({
          address: leg.tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [getBundleExecutorAddress(), maxUint256],
          chainId: sepolia.id,
        })

        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
        if (receipt.status === 'reverted') {
          throw new Error(
            leg.kind === 'protocol_fee'
              ? 'USDC protocol fee approval transaction reverted'
              : `${leg.symbol} approval transaction reverted`,
          )
        }

        setPendingSymbol(null)
        setRefreshNonce((value) => value + 1)

        if (requiresApprovals && approvalLegDefs.length > 0) {
          const next = await readAllowances(publicClient, address, approvalLegDefs, null)
          setLegs(next)
        }

        await options.onApprovalSuccess?.()
        return true
      } catch {
        const fallback =
          leg.kind === 'protocol_fee'
            ? 'Approve USDC protocol fee before selling.'
            : `${leg.symbol} approval failed — try again in wallet.`
        setApprovalError(fallback)
        return false
      } finally {
        setPendingSymbol(null)
      }
    },
    [
      address,
      publicClient,
      writeContractAsync,
      requiresApprovals,
      approvalLegDefs,
      options,
    ],
  )

  const approveToken = useCallback(
    async (symbolOrId: string) => {
      const leg = findApprovalLeg(legs, symbolOrId)
      if (!leg) {
        setApprovalError(`No approval requirement found for ${symbolOrId}`)
        return
      }
      if (leg.sufficient) return
      await submitApproval(leg)
    },
    [legs, submitApproval],
  )

  const approveMissingPortfolioTokens = useCallback(async () => {
    if (!address || !publicClient || approvalLegDefs.length === 0) {
      setApprovalError('Connect wallet on Sepolia to approve tokens')
      return
    }

    setApprovalError(null)

    const current = await readAllowances(publicClient, address, approvalLegDefs, null)
    const inputMissing = current.filter((leg) => leg.kind === 'input' && !leg.sufficient)

    for (const leg of inputMissing) {
      const ok = await submitApproval(leg)
      if (!ok) return
    }
  }, [address, publicClient, approvalLegDefs, submitApproval])

  const approveAllMissing = useCallback(async () => {
    await approveMissingPortfolioTokens()
    if (!address || !publicClient || approvalLegDefs.length === 0) return

    const current = await readAllowances(publicClient, address, approvalLegDefs, null)
    const feeMissing = current.find((leg) => leg.kind === 'protocol_fee' && !leg.sufficient)
    if (feeMissing) {
      await submitApproval(feeMissing)
    }
  }, [address, publicClient, approvalLegDefs, submitApproval, approveMissingPortfolioTokens])

  const protocolFeeLeg = legs.find((leg) => leg.kind === 'protocol_fee') ?? null
  const inputLegs = legs.filter((leg) => leg.kind === 'input')
  const missingInputApprovals = inputLegs.filter((leg) => !leg.sufficient)
  const missingUsdcFeeApproval = protocolFeeLeg != null && !protocolFeeLeg.sufficient
  const portfolioApprovalsSufficient =
    inputLegs.length === 0 || inputLegs.every((leg) => leg.sufficient)
  const allApprovalsSufficient =
    !requiresApprovals || (legs.length > 0 && legs.every((leg) => leg.sufficient))

  return {
    requiresApprovals,
    legs,
    inputLegs,
    protocolFeeLeg,
    allApprovalsSufficient,
    portfolioApprovalsSufficient,
    missingUsdcFeeApproval,
    missingInputApprovals,
    pendingSymbol,
    isApproving: isWritePending || pendingSymbol !== null,
    approvalError,
    refetchAllowances,
    approveToken,
    approveMissingPortfolioTokens,
    approveAllMissing,
  }
}

function approvalStatusLabel(status: TestnetApprovalStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'pending':
      return 'Pending'
    case 'needs_approval':
      return 'Needs approval'
  }
}

export { approvalStatusLabel }
