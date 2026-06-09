/**
 * Phase C — manual Sepolia executeBasket test (native ETH leg → MockRouter).
 *
 * MANUAL ONLY — run explicitly:
 *   npm run testnet:mock-eth
 *
 * Requires contracts/.env with SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY.
 * Not wired to PortX frontend/backend. Does not enable app live execution.
 */
import { ethers } from 'hardhat'
import type { BundleExecutor, MockRouter } from '../../typechain-types'

const SEPOLIA_CHAIN_ID = 11155111

const BUNDLE_EXECUTOR_ADDRESS = '0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B'
const MOCK_ROUTER_ADDRESS = '0x9963Cf861beddd418EbbD0A101DC3B135348cC2d'

const BASKET_ID = ethers.id('MOCK_ETH_TEST')
const AMOUNT_IN = ethers.parseEther('0.00001')
const MOCK_RETURN_AMOUNT = 1_000n
/** Empty calldata hits MockRouter fallback (success path) */
const MOCK_ROUTER_SUCCESS_DATA = '0x'

async function main() {
  const network = await ethers.provider.getNetwork()
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    throw new Error(`Refusing to run: expected Sepolia (${SEPOLIA_CHAIN_ID}), got chain ${network.chainId}`)
  }

  const [deployer] = await ethers.getSigners()
  console.log('Network:', network.name, `(${network.chainId})`)
  console.log('Deployer:', deployer.address)
  console.log('BundleExecutor:', BUNDLE_EXECUTOR_ADDRESS)
  console.log('MockRouter:', MOCK_ROUTER_ADDRESS)
  console.log('basketId:', BASKET_ID, '(MOCK_ETH_TEST)')

  const executor = (await ethers.getContractAt(
    'BundleExecutor',
    BUNDLE_EXECUTOR_ADDRESS
  )) as BundleExecutor
  const router = (await ethers.getContractAt('MockRouter', MOCK_ROUTER_ADDRESS)) as MockRouter

  const configureTx = await router.setReturnAmount(MOCK_RETURN_AMOUNT)
  console.log('MockRouter.setReturnAmount tx:', configureTx.hash)
  await configureTx.wait()

  const swaps = [
    {
      router: MOCK_ROUTER_ADDRESS,
      data: MOCK_ROUTER_SUCCESS_DATA,
      tokenIn: ethers.ZeroAddress,
      amountIn: AMOUNT_IN,
      minAmountOut: 0n,
      tokenOut: ethers.ZeroAddress,
    },
  ]

  console.log('Executing executeBasket (ETH leg)...')
  console.log('  amountIn:', ethers.formatEther(AMOUNT_IN), 'ETH')
  console.log('  msg.value:', ethers.formatEther(AMOUNT_IN), 'ETH')

  const tx = await executor.executeBasket(BASKET_ID, swaps, { value: AMOUNT_IN })
  console.log('executeBasket tx:', tx.hash)
  const receipt = await tx.wait()
  if (!receipt) throw new Error('Missing transaction receipt')

  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED')
  console.log('Gas used:', receipt.gasUsed.toString())
  console.log('Etherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`)

  for (const log of receipt.logs) {
    try {
      const parsed = executor.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      })
      if (!parsed) continue
      if (parsed.name === 'SwapExecuted' || parsed.name === 'BasketExecuted') {
        console.log(`Event ${parsed.name}:`, parsed.args.toObject())
      }
    } catch {
      /* unrelated log */
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
