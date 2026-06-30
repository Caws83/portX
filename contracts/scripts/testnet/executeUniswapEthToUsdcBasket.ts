/**
 * Phase D — manual Sepolia executeBasket test (native ETH leg → Uniswap V3 SwapRouter02).
 *
 * MANUAL ONLY — run explicitly:
 *   npm run testnet:uni-eth-usdc
 *
 * Requires contracts/.env with SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY.
 * Not wired to PortX frontend/backend. Does not enable app live execution.
 *
 * T-2: recipient = user wallet; outputs verified on deployer USDC balance.
 */
import { ethers } from 'hardhat'
import type { BundleExecutor } from '../../typechain-types'

const SEPOLIA_CHAIN_ID = 11155111

const BUNDLE_EXECUTOR_ADDRESS =
  process.env.BUNDLE_EXECUTOR_ADDRESS ?? '0x62cf7897E37155404658f885743BAfE4CDd58890'
const SWAP_ROUTER02_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'
const QUOTER_V2_ADDRESS = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const POOL_FEE = 3000
const SLIPPAGE_BPS = 300
const AMOUNT_IN = ethers.parseEther('0.0001')
const BASKET_ID = ethers.id('REAL_UNI_ETH_USDC_D')

const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
] as const

const SWAP_ROUTER02_ABI = [
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
] as const

const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)'] as const

function applySlippage(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * BigInt(10_000 - slippageBps)) / 10_000n
}

function formatUsdc(amount: bigint): string {
  return ethers.formatUnits(amount, 6)
}

async function quoteEthToUsdc(): Promise<bigint> {
  const quoter = new ethers.Contract(QUOTER_V2_ADDRESS, QUOTER_V2_ABI, ethers.provider)
  const quote = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    amountIn: AMOUNT_IN,
    fee: POOL_FEE,
    sqrtPriceLimitX96: 0,
  })
  return quote[0] as bigint
}

function encodeExactInputSingle(recipient: string, minAmountOut: bigint): string {
  const routerInterface = new ethers.Interface(SWAP_ROUTER02_ABI)
  return routerInterface.encodeFunctionData('exactInputSingle', [
    {
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      fee: POOL_FEE,
      recipient,
      amountIn: AMOUNT_IN,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0,
    },
  ])
}

async function readUsdcBalance(holder: string): Promise<bigint> {
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, ethers.provider)
  return usdc.balanceOf(holder) as Promise<bigint>
}

async function ensureRouterAllowlisted(executor: BundleExecutor, router: string): Promise<void> {
  const allowed = await executor.allowedRouters(router)
  if (allowed) {
    console.log('SwapRouter02 already allowlisted')
    return
  }

  console.log('Allowlisting SwapRouter02 on BundleExecutor...')
  const tx = await executor.setRouterAllowed(router, true)
  await tx.wait()
  console.log('SwapRouter02 allowlisted')
}

async function main() {
  const network = await ethers.provider.getNetwork()
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    throw new Error(`Refusing to run: expected Sepolia (${SEPOLIA_CHAIN_ID}), got chain ${network.chainId}`)
  }

  const [deployer] = await ethers.getSigners()
  console.log('Network:', network.name, `(${network.chainId})`)
  console.log('Deployer:', deployer.address)
  console.log('BundleExecutor:', BUNDLE_EXECUTOR_ADDRESS)
  console.log('SwapRouter02:', SWAP_ROUTER02_ADDRESS)
  console.log('QuoterV2:', QUOTER_V2_ADDRESS)
  console.log('WETH:', WETH_ADDRESS)
  console.log('USDC:', USDC_ADDRESS)
  console.log('Pool fee:', POOL_FEE)
  console.log('Slippage bps:', SLIPPAGE_BPS)
  console.log('basketId:', BASKET_ID, '(REAL_UNI_ETH_USDC_D)')

  const quotedOut = await quoteEthToUsdc()
  const minAmountOut = applySlippage(quotedOut, SLIPPAGE_BPS)
  const swapData = encodeExactInputSingle(deployer.address, minAmountOut)

  console.log('Quote output (USDC):', formatUsdc(quotedOut))
  console.log('Min output after slippage (USDC):', formatUsdc(minAmountOut))
  console.log('Recipient (user wallet):', deployer.address)
  console.log('Calldata size (bytes):', (swapData.length - 2) / 2)

  const swaps = [
    {
      router: SWAP_ROUTER02_ADDRESS,
      data: swapData,
      tokenIn: ethers.ZeroAddress,
      amountIn: AMOUNT_IN,
      minAmountOut,
      tokenOut: USDC_ADDRESS,
    },
  ]

  const executor = (await ethers.getContractAt(
    'BundleExecutor',
    BUNDLE_EXECUTOR_ADDRESS,
  )) as BundleExecutor

  await ensureRouterAllowlisted(executor, SWAP_ROUTER02_ADDRESS)

  const userUsdcBefore = await readUsdcBalance(deployer.address)
  const executorUsdcBefore = await readUsdcBalance(BUNDLE_EXECUTOR_ADDRESS)
  console.log('User USDC balance (before):', formatUsdc(userUsdcBefore))
  console.log('BundleExecutor USDC balance (before):', formatUsdc(executorUsdcBefore))

  console.log('Simulating executeBasket (staticCall)...')
  await executor.executeBasket.staticCall(BASKET_ID, swaps, { value: AMOUNT_IN })
  console.log('staticCall: SUCCESS')

  console.log('Executing executeBasket (ETH → USDC via Uniswap)...')
  console.log('  amountIn:', ethers.formatEther(AMOUNT_IN), 'ETH')
  console.log('  msg.value:', ethers.formatEther(AMOUNT_IN), 'ETH')

  const tx = await executor.executeBasket(BASKET_ID, swaps, { value: AMOUNT_IN })
  console.log('executeBasket tx:', tx.hash)
  const receipt = await tx.wait()
  if (!receipt) throw new Error('Missing transaction receipt')

  const userUsdcAfter = await readUsdcBalance(deployer.address)
  const executorUsdcAfter = await readUsdcBalance(BUNDLE_EXECUTOR_ADDRESS)
  console.log('User USDC balance (after):', formatUsdc(userUsdcAfter))
  console.log('BundleExecutor USDC balance (after):', formatUsdc(executorUsdcAfter))
  console.log('USDC received by user:', formatUsdc(userUsdcAfter - userUsdcBefore))
  console.log('USDC stranded in executor:', formatUsdc(executorUsdcAfter - executorUsdcBefore))

  if (userUsdcAfter <= userUsdcBefore) {
    throw new Error('Expected user USDC balance to increase after swap')
  }
  if (executorUsdcAfter > executorUsdcBefore) {
    throw new Error('Expected no USDC stranded in BundleExecutor')
  }

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
