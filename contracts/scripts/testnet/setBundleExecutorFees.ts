/**
 * Toggle BundleExecutor protocol fee config on Sepolia (owner only).
 *
 * Usage:
 *   FEES_ENABLED=false npm run testnet:set-fees
 *   FEES_ENABLED=true BUY_FEE_BPS=30 SELL_FEE_BPS=30 FEE_RECIPIENT=0x... npm run testnet:set-fees
 *
 * Env:
 *   BUNDLE_EXECUTOR_ADDRESS — target executor (required)
 *   FEES_ENABLED — "true" | "false" (optional; omit to leave unchanged)
 *   FEE_RECIPIENT — address (optional; omit to leave unchanged)
 *   BUY_FEE_BPS — number (optional; omit to leave unchanged)
 *   SELL_FEE_BPS — number (optional; omit to leave unchanged)
 */
import { ethers } from 'hardhat'
import type { BundleExecutor } from '../../typechain-types'

const SEPOLIA_CHAIN_ID = 11155111

function parseBoolEnv(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  throw new Error(`Invalid boolean env value: ${value}`)
}

function parseOptionalUint16(name: string, value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const parsed = Number.parseInt(value.trim(), 10)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error(`${name} must be an integer between 0 and 65535`)
  }
  return parsed
}

async function printFeeConfig(label: string, executor: BundleExecutor): Promise<void> {
  const config = await executor.getFeeConfig()
  console.log(label)
  console.log('  feeRecipient:', config.feeRecipient)
  console.log('  buyFeeBps:', config.buyFeeBps.toString())
  console.log('  sellFeeBps:', config.sellFeeBps.toString())
  console.log('  maxFeeBps:', config.maxFeeBps.toString())
  console.log('  feesEnabled:', config.feesEnabled)
}

async function main() {
  const network = await ethers.provider.getNetwork()
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    throw new Error(`Expected Sepolia (${SEPOLIA_CHAIN_ID}), got ${network.chainId}`)
  }

  const executorAddress = process.env.BUNDLE_EXECUTOR_ADDRESS
  if (!executorAddress) {
    throw new Error('BUNDLE_EXECUTOR_ADDRESS is required')
  }

  const feesEnabled = parseBoolEnv(process.env.FEES_ENABLED)
  const feeRecipient = process.env.FEE_RECIPIENT?.trim() || undefined
  const buyFeeBps = parseOptionalUint16('BUY_FEE_BPS', process.env.BUY_FEE_BPS)
  const sellFeeBps = parseOptionalUint16('SELL_FEE_BPS', process.env.SELL_FEE_BPS)

  if (
    feesEnabled === undefined &&
    feeRecipient === undefined &&
    buyFeeBps === undefined &&
    sellFeeBps === undefined
  ) {
    throw new Error(
      'Set at least one of FEES_ENABLED, FEE_RECIPIENT, BUY_FEE_BPS, or SELL_FEE_BPS',
    )
  }

  const [signer] = await ethers.getSigners()
  console.log('Signer:', signer.address)
  console.log('BundleExecutor:', executorAddress)

  const executor = (await ethers.getContractAt(
    'BundleExecutor',
    executorAddress,
  )) as BundleExecutor

  const owner = await executor.owner()
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is not owner (owner=${owner})`)
  }

  await printFeeConfig('Before:', executor)

  if (feeRecipient !== undefined) {
    console.log(`Setting feeRecipient → ${feeRecipient}`)
    const tx = await executor.setFeeRecipient(feeRecipient)
    await tx.wait()
  }

  if (buyFeeBps !== undefined) {
    console.log(`Setting buyFeeBps → ${buyFeeBps}`)
    const tx = await executor.setBuyFeeBps(buyFeeBps)
    await tx.wait()
  }

  if (sellFeeBps !== undefined) {
    console.log(`Setting sellFeeBps → ${sellFeeBps}`)
    const tx = await executor.setSellFeeBps(sellFeeBps)
    await tx.wait()
  }

  if (feesEnabled !== undefined) {
    console.log(`Setting feesEnabled → ${feesEnabled}`)
    const tx = await executor.setFeesEnabled(feesEnabled)
    await tx.wait()
  }

  await printFeeConfig('After:', executor)
  console.log('Fee configuration complete')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
