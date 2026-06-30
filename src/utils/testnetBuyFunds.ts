import { formatEther } from 'viem'

import { TESTNET_MAX_SWAP_AMOUNT_WEI } from '@/config/testnetExecution'
import type { BundleExecutorFeeConfig } from '@/services/bundleExecutorContract'
import {
  estimateBuyProtocolFee,
  grossUpEthValueForBuyFee,
} from '@/services/protocolFee'
import type { ExecutionPlan } from '@/types/execution'
import { sumTestnetPlanInputWei } from '@/utils/testnetPreview'

export interface TestnetBuyFundsAssessment {
  swapEthWei: bigint
  protocolFeeWei: bigint
  finalEthRequiredWei: bigint
  withinTestnetCap: boolean
  walletEthBalanceWei: bigint | null
  sufficientEth: boolean
  blockedReason: string | null
}

export function assessTestnetBuyWalletFunds(params: {
  plan: ExecutionPlan
  feeConfig: BundleExecutorFeeConfig | null
  walletEthBalanceWei?: bigint | null
}): TestnetBuyFundsAssessment {
  const swapEthWei = sumTestnetPlanInputWei(params.plan)
  const protocolFeeWei = estimateBuyProtocolFee(swapEthWei, params.feeConfig)
  const finalEthRequiredWei = grossUpEthValueForBuyFee(swapEthWei, params.feeConfig)
  const withinTestnetCap = swapEthWei <= TESTNET_MAX_SWAP_AMOUNT_WEI
  const walletEthBalanceWei = params.walletEthBalanceWei ?? null
  const sufficientEth =
    walletEthBalanceWei == null ? true : walletEthBalanceWei >= finalEthRequiredWei

  let blockedReason: string | null = null
  if (!withinTestnetCap) {
    blockedReason = `Buy amount exceeds Sepolia testnet cap of ${formatEther(TESTNET_MAX_SWAP_AMOUNT_WEI)} ETH. Choose a smaller amount.`
  } else if (walletEthBalanceWei != null && !sufficientEth) {
    blockedReason = `Insufficient Sepolia ETH. Need ${formatEther(finalEthRequiredWei)} ETH (incl. protocol fee); wallet has ${formatEther(walletEthBalanceWei)} ETH.`
  }

  return {
    swapEthWei,
    protocolFeeWei,
    finalEthRequiredWei,
    withinTestnetCap,
    walletEthBalanceWei,
    sufficientEth,
    blockedReason,
  }
}
