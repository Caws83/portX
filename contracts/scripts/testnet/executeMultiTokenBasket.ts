/**
 * Manual Sepolia multi-token basket execute (LINK / UNI / WETH / AAVE).
 *
 * npm run testnet:multi-token-basket
 *
 * Requires T-2 BundleExecutor deployed + SwapRouter02 + WETH9 allowlisted.
 */
import { ethers } from 'hardhat'
import type { BundleExecutor } from '../../typechain-types'

const SEPOLIA_CHAIN_ID = 11155111
const BUNDLE_EXECUTOR_ADDRESS =
  process.env.BUNDLE_EXECUTOR_ADDRESS ?? '0x62cf7897E37155404658f885743BAfE4CDd58890'
const SWAP_ROUTER02 = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'
const QUOTER_V2 = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'

const TOKENS = [
  { symbol: 'LINK', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', weight: 40, fee: 500 },
  { symbol: 'UNI', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', weight: 30, fee: 3000 },
  { symbol: 'WETH', address: WETH, weight: 20, fee: 3000 },
  { symbol: 'AAVE', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', weight: 10, fee: 3000 },
] as const

const TOTAL_ETH = ethers.parseEther('0.0001')
const SLIPPAGE_BPS = 300
const BASKET_ID = ethers.id('SEPOLIA_MULTI_TOKEN_BETA')

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
] as const

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
] as const

const WETH_DEPOSIT_ABI = ['function deposit() payable'] as const

const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)'] as const

function splitWeights(total: bigint, weights: number[]): bigint[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const amounts: bigint[] = []
  let allocated = 0n
  for (let index = 0; index < weights.length; index++) {
    if (index === weights.length - 1) {
      amounts.push(total - allocated)
      continue
    }
    const share = (total * BigInt(weights[index] * 100)) / BigInt(weightSum * 100)
    amounts.push(share)
    allocated += share
  }
  return amounts
}

function applySlippage(amountOut: bigint): bigint {
  return (amountOut * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n
}

async function ensureRouterAllowed(executor: BundleExecutor, router: string): Promise<void> {
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
    throw new Error(`Expected Sepolia (${SEPOLIA_CHAIN_ID})`)
  }

  const [deployer] = await ethers.getSigners()
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, ethers.provider)
  const routerInterface = new ethers.Interface(ROUTER_ABI)
  const wethInterface = new ethers.Interface(WETH_DEPOSIT_ABI)
  const weights = TOKENS.map((token) => token.weight)
  const ethAmounts = splitWeights(TOTAL_ETH, weights)

  const swaps = []
  for (let index = 0; index < TOKENS.length; index++) {
    const token = TOKENS[index]
    const amountIn = ethAmounts[index]

    if (token.symbol === 'WETH') {
      const quotedOut = amountIn
      const minAmountOut = applySlippage(quotedOut)
      swaps.push({
        router: WETH,
        data: wethInterface.encodeFunctionData('deposit', []),
        tokenIn: ethers.ZeroAddress,
        amountIn,
        minAmountOut,
        tokenOut: WETH,
      })
      console.log(
        token.symbol,
        'amountIn',
        ethers.formatEther(amountIn),
        'ETH',
        'quotedOut (1:1 wrap)',
        quotedOut.toString(),
      )
      continue
    }

    const quotedOut = (
      await quoter.quoteExactInputSingle.staticCall({
        tokenIn: WETH,
        tokenOut: token.address,
        amountIn,
        fee: token.fee,
        sqrtPriceLimitX96: 0,
      })
    )[0] as bigint
    const minAmountOut = applySlippage(quotedOut)
    const data = routerInterface.encodeFunctionData('exactInputSingle', [
      {
        tokenIn: WETH,
        tokenOut: token.address,
        fee: token.fee,
        recipient: deployer.address,
        amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0,
      },
    ])

    swaps.push({
      router: SWAP_ROUTER02,
      data,
      tokenIn: ethers.ZeroAddress,
      amountIn,
      minAmountOut,
      tokenOut: token.address,
    })

    console.log(
      token.symbol,
      'amountIn',
      ethers.formatEther(amountIn),
      'ETH',
      'quotedOut',
      quotedOut.toString(),
    )
  }

  const executor = (await ethers.getContractAt('BundleExecutor', BUNDLE_EXECUTOR_ADDRESS)) as BundleExecutor
  await ensureRouterAllowed(executor, SWAP_ROUTER02)
  await ensureRouterAllowed(executor, WETH)

  const balancesBefore: Record<string, bigint> = {}
  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, ethers.provider)
    balancesBefore[token.symbol] = await erc20.balanceOf(deployer.address)
  }

  const tx = await executor.executeBasket(BASKET_ID, swaps, { value: TOTAL_ETH })
  console.log('tx', tx.hash)
  const receipt = await tx.wait()

  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, ethers.provider)
    const after = await erc20.balanceOf(deployer.address)
    const delta = after - balancesBefore[token.symbol]
    console.log(`${token.symbol} received:`, delta.toString())
    if (delta <= 0n) throw new Error(`Expected ${token.symbol} balance to increase`)
  }

  const executorAddr = BUNDLE_EXECUTOR_ADDRESS
  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, ethers.provider)
    const stranded = await erc20.balanceOf(executorAddr)
    console.log(`${token.symbol} stranded in executor:`, stranded.toString())
    if (stranded > 0n) throw new Error(`${token.symbol} stranded in BundleExecutor`)
  }

  console.log('Status: SUCCESS')
  console.log('Gas used:', receipt?.gasUsed.toString())
  console.log(`Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
