import { APP_MODE, type AppMode } from '@/config/appMode'
import { ENABLE_TESTNET_MODE } from '@/config/features'
import {
  getChainById,
  getChainByKey,
  getDefaultChainForAppMode,
  type ChainRegistryEntry,
  type ChainRegistryKey,
} from '@/config/chainsRegistry'
import type { Basket } from '@/types/basket'
import type { BasketChain } from '@/types/basketChain'
import type { ExecutionPlan } from '@/types/execution'

const BASKET_CHAIN_TO_REGISTRY: Partial<Record<BasketChain, ChainRegistryKey>> = {
  ethereum: 'ethereum',
  base: 'base',
  avalanche: 'avalanche',
  bsc: 'bsc',
}

export interface ResolveRequiredTradeChainOptions {
  plan?: ExecutionPlan | null
  selectedBasket?: Basket | null
  modalOpen?: boolean
  appMode?: AppMode
}

/** Resolve the chain a trade must execute on — registry-driven, no hardcoded IDs. */
export function resolveRequiredTradeChain(
  options: ResolveRequiredTradeChainOptions = {},
): ChainRegistryEntry {
  const mode = options.appMode ?? APP_MODE

  if (options.plan?.chainId != null) {
    const fromPlan = getChainById(options.plan.chainId)
    if (fromPlan) return fromPlan
  }

  if (ENABLE_TESTNET_MODE || mode === 'testnet') {
    return getDefaultChainForAppMode('testnet')
  }

  if (options.selectedBasket) {
    const registryKey = BASKET_CHAIN_TO_REGISTRY[options.selectedBasket.chain]
    if (registryKey) {
      const fromBasket = getChainByKey(registryKey)
      if (fromBasket) return fromBasket
    }
  }

  return getDefaultChainForAppMode(mode)
}

export function isWalletOnRequiredTradeChain(
  walletChainId: number | undefined,
  requiredChainId: number,
  isConnected: boolean,
): boolean {
  if (!isConnected || walletChainId == null) return false
  return walletChainId === requiredChainId
}
