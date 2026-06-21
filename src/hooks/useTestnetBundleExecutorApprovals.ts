import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import type { Address } from 'viem'
import { erc20Abi, formatUnits } from 'viem'
import { sepolia } from 'viem/chains'
import { wagmiConfig } from '@/config/wagmi'
import { TESTNET_SEPOLIA_CHAIN_ID } from '@/config/testnetExecution'
import { getBundleExecutorAddress } from '@/services/bundleExecutorContract'
import type { ExecutionPlan } from '@/types/execution'
import { isZeroAddress } from '@/utils/addresses'
import { isTestnetSepoliaUniswapPlan } from '@/utils/testnetPreview'

export interface TestnetApprovalRequirement {
  symbol: string
  tokenAddress: Address
  amountRequired: bigint
  amountDisplay: string
  allowance: bigint
  sufficient: boolean
}

export interface UseTestnetBundleExecutorApprovalsResult {
  requiresApprovals: boolean
  legs: TestnetApprovalRequirement[]
  allApprovalsSufficient: boolean
  pendingSymbol: string | null
  isApproving: boolean
  approvalError: string | null
  refetchAllowances: () => Promise<void>
  approveToken: (symbol: string) => Promise<void>
}

function isErc20SellLeg(leg: ExecutionPlan['legs'][number]): boolean {
  const symbol = leg.quote.inputToken.symbol.toUpperCase()
  if (symbol === 'ETH') return false
  if (isZeroAddress(leg.quote.inputToken.address)) return false
  return true
}

function buildApprovalLegs(plan: ExecutionPlan): Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient'>[] {
  const byToken = new Map<string, Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient'>>()

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
      symbol: leg.quote.inputToken.symbol,
      tokenAddress: leg.quote.inputToken.address as Address,
      amountRequired,
      amountDisplay: formatUnits(amountRequired, leg.quote.inputToken.decimals),
    })
  }

  return [...byToken.values()]
}

async function readAllowances(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  owner: Address,
  legs: Omit<TestnetApprovalRequirement, 'allowance' | 'sufficient'>[],
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

      return {
        ...leg,
        allowance,
        sufficient: allowance >= leg.amountRequired,
      }
    }),
  )
}

export function useTestnetBundleExecutorApprovals(
  plan: ExecutionPlan | null,
  open: boolean,
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
    return buildApprovalLegs(plan).length > 0
  }, [plan, open])

  const approvalLegDefs = useMemo(() => {
    if (!requiresApprovals || !plan) return []
    return buildApprovalLegs(plan)
  }, [requiresApprovals, plan])

  const refetchAllowances = useCallback(async () => {
    if (!requiresApprovals || !address || !publicClient || approvalLegDefs.length === 0) {
      setLegs([])
      return
    }

    const next = await readAllowances(publicClient, address, approvalLegDefs)
    setLegs(next)
  }, [requiresApprovals, address, publicClient, approvalLegDefs])

  useEffect(() => {
    if (!open) {
      setLegs([])
      return
    }
    void refetchAllowances()
  }, [open, refetchAllowances, refreshNonce])

  const approveToken = useCallback(
    async (symbol: string) => {
      if (!address || !publicClient) {
        setApprovalError('Connect wallet on Sepolia to approve tokens')
        return
      }

      const leg = legs.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase())
      if (!leg) {
        setApprovalError(`No approval requirement found for ${symbol}`)
        return
      }

      setPendingSymbol(leg.symbol)
      setApprovalError(null)

      try {
        const hash = await writeContractAsync({
          address: leg.tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [getBundleExecutorAddress(), leg.amountRequired],
          chainId: sepolia.id,
        })

        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
        if (receipt.status === 'reverted') {
          throw new Error(`${leg.symbol} approval transaction reverted`)
        }

        setRefreshNonce((value) => value + 1)
      } catch (error) {
        setApprovalError(error instanceof Error ? error.message : `${leg.symbol} approval failed`)
      } finally {
        setPendingSymbol(null)
      }
    },
    [address, publicClient, legs, writeContractAsync],
  )

  const allApprovalsSufficient =
    !requiresApprovals || (legs.length > 0 && legs.every((leg) => leg.sufficient))

  return {
    requiresApprovals,
    legs,
    allApprovalsSufficient,
    pendingSymbol,
    isApproving: isWritePending || pendingSymbol !== null,
    approvalError,
    refetchAllowances,
    approveToken,
  }
}
