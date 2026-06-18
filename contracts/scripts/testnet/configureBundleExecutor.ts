/**
 * Post-deploy configuration for T-2 hardened BundleExecutor on Sepolia.
 *
 * Allowlists SwapRouter02 and MockRouter for executeBasket.
 *
 * Usage (after redeploy):
 *   npx hardhat run scripts/testnet/configureBundleExecutor.ts --network sepolia
 *
 * Set BUNDLE_EXECUTOR_ADDRESS in contracts/.env or pass via env.
 */
import { ethers } from 'hardhat'
import type { BundleExecutor } from '../../typechain-types'

const SEPOLIA_CHAIN_ID = 11155111

const SWAP_ROUTER02_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'
const MOCK_ROUTER_ADDRESS = '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d'

const ROUTERS = [SWAP_ROUTER02_ADDRESS, MOCK_ROUTER_ADDRESS] as const

async function ensureAllowed(executor: BundleExecutor, router: string): Promise<void> {
  const allowed = await executor.allowedRouters(router)
  if (allowed) {
    console.log(`Already allowlisted: ${router}`)
    return
  }
  const tx = await executor.setRouterAllowed(router, true)
  await tx.wait()
  console.log(`Allowlisted: ${router}`)
}

async function main() {
  const network = await ethers.provider.getNetwork()
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    throw new Error(`Expected Sepolia (${SEPOLIA_CHAIN_ID}), got ${network.chainId}`)
  }

  const executorAddress =
    process.env.BUNDLE_EXECUTOR_ADDRESS ?? '0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B'

  const [deployer] = await ethers.getSigners()
  console.log('Deployer:', deployer.address)
  console.log('BundleExecutor:', executorAddress)

  const executor = (await ethers.getContractAt(
    'BundleExecutor',
    executorAddress,
  )) as BundleExecutor

  const owner = await executor.owner()
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not owner (owner=${owner})`)
  }

  for (const router of ROUTERS) {
    await ensureAllowed(executor, router)
  }

  console.log('Router allowlist configuration complete')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
