import { expect } from 'chai'

/** Mirrors frontend WETH_DEPOSIT_CALLDATA / isValidBundleSwapCalldata rules */
const WETH_DEPOSIT_CALLDATA = '0xd0e30db0'

function isWethDepositCalldata(data: string | null | undefined): boolean {
  return data?.toLowerCase() === WETH_DEPOSIT_CALLDATA
}

function isValidCalldata(calldata: string): boolean {
  if (!calldata?.startsWith('0x')) return false
  const body = calldata.slice(2)
  if (body.length < 16) return false
  if (!/^[0-9a-fA-F]+$/.test(body)) return false
  if (/^0+$/.test(body)) return false
  return true
}

function isValidBundleSwapCalldata(data: string | null | undefined): boolean {
  if (!data?.startsWith('0x')) return false
  if (isWethDepositCalldata(data)) return true
  return isValidCalldata(data)
}

describe('bundleExecutorCalldata validation (frontend parity)', () => {
  it('accepts WETH deposit selector-only calldata', () => {
    expect(isWethDepositCalldata(WETH_DEPOSIT_CALLDATA)).to.equal(true)
    expect(isValidBundleSwapCalldata(WETH_DEPOSIT_CALLDATA)).to.equal(true)
  })

  it('rejects empty or placeholder calldata', () => {
    expect(isValidBundleSwapCalldata('0x')).to.equal(false)
    expect(isValidBundleSwapCalldata('')).to.equal(false)
    expect(isValidBundleSwapCalldata(undefined)).to.equal(false)
  })

  it('accepts standard exactInputSingle-length ABI payloads', () => {
    const exactInputSingle =
      '0x414bf389' +
      '0'.repeat(512)
    expect(isValidBundleSwapCalldata(exactInputSingle)).to.equal(true)
  })
})
