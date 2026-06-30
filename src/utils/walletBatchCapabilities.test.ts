import { describe, expect, it } from 'vitest'
import { decodeFunctionData, erc20Abi, maxUint256 } from 'viem'

import { getChainByKey } from '@/config/chainsRegistry'
import {
  buildExactApprovalCalls,
  encodeErc20ApproveCalldata,
  resolveBatchApprovalAmount,
  type BatchApprovalLegDef,
} from '@/services/batchExactApprovals'
import {
  parseWalletBatchCapabilities,
  resolveChainCapabilities,
} from '@/utils/walletBatchCapabilities'

const SEPOLIA_CHAIN_ID = getChainByKey('sepolia')!.chainId
const SPENDER = '0x9A0D2318EE444a3Eee64714E60b0fB3C5261C2e2' as const
const LINK = '0x779877A7Ba0f12C5535E2733Bb5b5e2dE28e9C5f' as const
const UNI = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' as const

const sampleLegs: BatchApprovalLegDef[] = [
  {
    id: 'input-link',
    tokenAddress: LINK,
    approvalAmount: 1_000_000_000_000_000_000n,
  },
  {
    id: 'input-uni',
    tokenAddress: UNI,
    approvalAmount: 2_000_000_000_000_000_000n,
  },
]

describe('walletBatchCapabilities', () => {
  it('detects atomic batch support when status is ready', () => {
    const capabilities = {
      [SEPOLIA_CHAIN_ID]: {
        atomic: { status: 'ready' },
      },
    }

    expect(parseWalletBatchCapabilities(capabilities, SEPOLIA_CHAIN_ID)).toEqual({
      supportsBatchApprovals: true,
      supportsAtomicBatch: true,
      reason: null,
    })
  })

  it('detects atomic batch support when status is supported', () => {
    const capabilities = {
      '0xaa36a7': {
        atomic: { status: 'supported' },
      },
    }

    expect(parseWalletBatchCapabilities(capabilities, SEPOLIA_CHAIN_ID)).toEqual({
      supportsBatchApprovals: true,
      supportsAtomicBatch: true,
      reason: null,
    })
  })

  it('returns unsupported reason when atomic batch is unavailable', () => {
    const capabilities = {
      [SEPOLIA_CHAIN_ID]: {
        atomic: { status: 'unsupported' },
      },
    }

    expect(parseWalletBatchCapabilities(capabilities, SEPOLIA_CHAIN_ID)).toEqual({
      supportsBatchApprovals: false,
      supportsAtomicBatch: false,
      reason: 'Wallet does not support batch transactions on this chain.',
    })
  })

  it('returns unsupported when capabilities are missing', () => {
    expect(parseWalletBatchCapabilities(undefined, SEPOLIA_CHAIN_ID)).toEqual({
      supportsBatchApprovals: false,
      supportsAtomicBatch: false,
      reason: 'Wallet did not report EIP-5792 capabilities.',
    })
  })

  it('resolves chain capabilities from hex chain id keys', () => {
    const capabilities = {
      '0xaa36a7': { atomic: { status: 'ready' } },
    }

    expect(resolveChainCapabilities(capabilities, SEPOLIA_CHAIN_ID)).toEqual({
      atomic: { status: 'ready' },
    })
  })
})

describe('batchExactApprovals', () => {
  it('encodes exact approve calldata by default', () => {
    const amount = 1_500_000n
    const data = encodeErc20ApproveCalldata(SPENDER, amount)
    const decoded = decodeFunctionData({
      abi: erc20Abi,
      data,
    })

    expect(decoded.functionName).toBe('approve')
    expect(decoded.args?.[0]).toBe(SPENDER)
    expect(decoded.args?.[1]).toBe(amount)
  })

  it('uses exact amount unless preferMaxApproval is explicitly true', () => {
    const leg = { approvalAmount: 123n }

    expect(resolveBatchApprovalAmount(leg, false)).toBe(123n)
    expect(resolveBatchApprovalAmount(leg, true)).toBe(maxUint256)
  })

  it('builds registry-backed approval calls without hardcoded chain ids in logic', () => {
    const calls = buildExactApprovalCalls({
      legs: sampleLegs,
      chainId: SEPOLIA_CHAIN_ID,
      spender: SPENDER,
    })

    expect(calls).toHaveLength(2)
    expect(calls.every((call) => call.chainId === SEPOLIA_CHAIN_ID)).toBe(true)

    for (const call of calls) {
      const decoded = decodeFunctionData({
        abi: erc20Abi,
        data: call.data,
      })
      expect(decoded.functionName).toBe('approve')
      expect(decoded.args?.[0]).toBe(SPENDER)
      expect(decoded.args?.[1]).not.toBe(maxUint256)
    }

    expect(
      decodeFunctionData({ abi: erc20Abi, data: calls[0]!.data }).args?.[1],
    ).toBe(sampleLegs[0]!.approvalAmount)
  })

  it('uses max approval only when preferMaxApproval=true', () => {
    const calls = buildExactApprovalCalls({
      legs: sampleLegs,
      chainId: SEPOLIA_CHAIN_ID,
      spender: SPENDER,
      preferMaxApproval: true,
    })

    for (const call of calls) {
      const decoded = decodeFunctionData({
        abi: erc20Abi,
        data: call.data,
      })
      expect(decoded.args?.[1]).toBe(maxUint256)
    }
  })
})
