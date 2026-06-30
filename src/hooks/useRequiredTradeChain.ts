import { useCallback, useMemo } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'

import type { Basket } from '@/types/basket'
import type { ExecutionPlan } from '@/types/execution'
import { getChainById, type ChainRegistryEntry } from '@/config/chainsRegistry'
import {
  isWalletOnRequiredTradeChain,
  resolveRequiredTradeChain,
} from '@/utils/tradeChainResolution'

export interface UseRequiredTradeChainOptions {
  plan?: ExecutionPlan | null
  selectedBasket?: Basket | null
  modalOpen?: boolean
}

export function useRequiredTradeChain(options: UseRequiredTradeChainOptions = {}) {
  const { address, isConnected } = useAccount()
  const walletChainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const requiredChain = useMemo(
    () =>
      resolveRequiredTradeChain({
        plan: options.plan,
        selectedBasket: options.selectedBasket,
        modalOpen: options.modalOpen,
      }),
    [options.plan, options.selectedBasket, options.modalOpen],
  )

  const walletChain = useMemo(
    () => (walletChainId != null ? getChainById(walletChainId) : undefined),
    [walletChainId],
  )

  const isCorrectChain = isWalletOnRequiredTradeChain(
    walletChainId,
    requiredChain.chainId,
    isConnected,
  )
  const isWrongChain = isConnected && !isCorrectChain

  const switchToRequiredChain = useCallback(() => {
    switchChain?.({ chainId: requiredChain.chainId })
  }, [switchChain, requiredChain.chainId])

  const walletChainLabel = useMemo((): string => {
    if (!isConnected) return 'Not connected'
    if (walletChain) return walletChain.name
    return walletChainId != null ? `Chain ${walletChainId}` : 'Unknown chain'
  }, [isConnected, walletChain, walletChainId])

  return {
    requiredChain,
    walletChain,
    walletChainId,
    walletChainLabel,
    walletAddress: address,
    isConnected,
    isCorrectChain,
    isWrongChain,
    isSwitching,
    switchToRequiredChain,
  } satisfies RequiredTradeChainState
}

export interface RequiredTradeChainState {
  requiredChain: ChainRegistryEntry
  walletChain: ChainRegistryEntry | undefined
  walletChainId: number
  walletChainLabel: string
  walletAddress: `0x${string}` | undefined
  isConnected: boolean
  isCorrectChain: boolean
  isWrongChain: boolean
  isSwitching: boolean
  switchToRequiredChain: () => void
}
