import { describe, expect, it } from 'vitest'
import { parseEther } from 'viem'
import type { ExecutionPlan } from '@/types/execution'
import { assessTestnetBuyWalletFunds } from '@/utils/testnetBuyFunds'

function buyPlan(inputEth: string): ExecutionPlan {
  const inputWei = parseEther(inputEth)
  return {
    id: 'test-buy-plan',
    type: 'buy',
    basketId: 'sepolia-multi-token-beta',
    legs: [
      {
        index: 0,
        quote: {
          inputToken: { symbol: 'ETH', name: 'Ether', address: '0x0000000000000000000000000000000000000000', decimals: 18, priceUsd: 2500, change24h: 0 },
          outputToken: { symbol: 'LINK', name: 'Chainlink', address: '0x779877A7Ba0f12C5535E2733Bb5b5e2dE28e9C5f', decimals: 18, priceUsd: 15, change24h: 0 },
          inputAmount: inputWei.toString(),
          outputAmount: '1',
          inputAmountUsd: 100,
          outputAmountUsd: 100,
          estimatedGasUsd: 0,
          estimatedGasUnits: 0,
          priceImpactPercent: 0,
          routeSummary: [],
          provider: 'uniswap-sepolia',
          routerAddress: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
          calldata: '0x414bf389' + '0'.repeat(512),
          warnings: [],
        },
      },
    ],
    totalInputUsd: 100,
    totalOutputUsd: 100,
    totalGasUsd: 0,
    slippageBps: 50,
    chainId: 11155111,
    isDemo: false,
    warnings: [],
  }
}

describe('assessTestnetBuyWalletFunds', () => {
  it('flags insufficient wallet ETH with a friendly reason', () => {
    const assessment = assessTestnetBuyWalletFunds({
      plan: buyPlan('0.04'),
      feeConfig: { feeRecipient: '0x0000000000000000000000000000000000000001', buyFeeBps: 100, sellFeeBps: 100, maxFeeBps: 500, feesEnabled: true },
      walletEthBalanceWei: parseEther('0.03'),
    })

    expect(assessment.sufficientEth).toBe(false)
    expect(assessment.blockedReason).toMatch(/Insufficient Sepolia ETH/)
    expect(assessment.finalEthRequiredWei).toBeGreaterThan(parseEther('0.04'))
  })

  it('passes when wallet ETH covers grossed-up buy value', () => {
    const assessment = assessTestnetBuyWalletFunds({
      plan: buyPlan('0.04'),
      feeConfig: null,
      walletEthBalanceWei: parseEther('0.05'),
    })

    expect(assessment.sufficientEth).toBe(true)
    expect(assessment.blockedReason).toBeNull()
    expect(assessment.finalEthRequiredWei).toBe(parseEther('0.04'))
  })

  it('flags amounts above the testnet cap', () => {
    const assessment = assessTestnetBuyWalletFunds({
      plan: buyPlan('0.6'),
      feeConfig: null,
      walletEthBalanceWei: parseEther('2'),
    })

    expect(assessment.withinTestnetCap).toBe(false)
    expect(assessment.blockedReason).toMatch(/testnet cap/)
    expect(assessment.swapEthWei).toBeGreaterThan(parseEther('0.5'))
  })
})
