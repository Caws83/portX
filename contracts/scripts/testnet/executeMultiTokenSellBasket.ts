/**
 * Manual Sepolia multi-token basket sell (LINK / UNI / WETH / AAVE → USDC).
 *
 * npm run testnet:multi-token-sell
 *
 * Requires wallet holdings from a prior multi-token buy + BundleExecutor approvals.
 */
import { ethers } from 'hardhat'
import type { BundleExecutor } from '../../typechain-types'

const SEPOLIA_CHAIN_ID = 11155111
const BUNDLE_EXECUTOR_ADDRESS =
  process.env.BUNDLE_EXECUTOR_ADDRESS ?? '0x62cf7897E37155404658f885743BAfE4CDd58890'
const SWAP_ROUTER02 = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'
const QUOTER_V2 = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const TOKENS = [
  { symbol: 'LINK', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', sellFee: 3000 },
  { symbol: 'UNI', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', sellFee: 500 },
  { symbol: 'WETH', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', sellFee: 500 },
  { symbol: 'AAVE', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', sellFee: 500 },
] as const

const SLIPPAGE_BPS = 300
const BASKET_ID = ethers.id('SEPOLIA_MULTI_TOKEN_SELL_BETA')

const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
] as const

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
] as const

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
] as const

function applySlippage(amountOut: bigint): bigint {
  return (amountOut * BigInt(10_000 - SLIPPAGE_BPS)) / 10_000n
}

async function ensureApproval(
  token: ethers.Contract,
  owner: string,
  spender: string,
  amount: bigint,
): Promise<void> {
  const allowance = (await token.allowance(owner, spender)) as bigint
  if (allowance >= amount) {
    console.log(`Allowance sufficient for ${spender}`)
    return
  }
  const tx = await token.approve(spender, amount)
  await tx.wait()
  console.log(`Approved ${amount.toString()} for BundleExecutor`)
}

async function main() {
  const network = await ethers.provider.getNetwork()
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    throw new Error(`Expected Sepolia (${SEPOLIA_CHAIN_ID})`)
  }

  const [deployer] = await ethers.getSigners()
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, ethers.provider)
  const routerInterface = new ethers.Interface(ROUTER_ABI)
  const usdc = new ethers.Contract(USDC, ERC20_ABI, deployer)

  const executor = (await ethers.getContractAt('BundleExecutor', BUNDLE_EXECUTOR_ADDRESS)) as BundleExecutor
  const allowed = await executor.allowedRouters(SWAP_ROUTER02)
  if (!allowed) {
    throw new Error('SwapRouter02 is not allowlisted on BundleExecutor')
  }

  const usdcBefore = (await usdc.balanceOf(deployer.address)) as bigint
  console.log('User USDC balance (before):', ethers.formatUnits(usdcBefore, 6))

  const swaps = []
  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, deployer)
    const amountIn = (await erc20.balanceOf(deployer.address)) as bigint
    if (amountIn <= 0n) {
      throw new Error(`No ${token.symbol} balance to sell`)
    }

    const quotedOut = (
      await quoter.quoteExactInputSingle.staticCall({
        tokenIn: token.address,
        tokenOut: USDC,
        amountIn,
        fee: token.sellFee,
        sqrtPriceLimitX96: 0,
      })
    )[0] as bigint
    const minAmountOut = applySlippage(quotedOut)

    await ensureApproval(erc20, deployer.address, BUNDLE_EXECUTOR_ADDRESS, amountIn)

    const data = routerInterface.encodeFunctionData('exactInputSingle', [
      {
        tokenIn: token.address,
        tokenOut: USDC,
        fee: token.sellFee,
        recipient: deployer.address,
        amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0,
      },
    ])

    swaps.push({
      router: SWAP_ROUTER02,
      data,
      tokenIn: token.address,
      amountIn,
      minAmountOut,
      tokenOut: USDC,
    })

    console.log(
      token.symbol,
      'amountIn',
      amountIn.toString(),
      'quotedUsdcOut',
      quotedOut.toString(),
      'minUsdcOut',
      minAmountOut.toString(),
    )
  }

  const inputBalancesBefore: Record<string, bigint> = {}
  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, ethers.provider)
    inputBalancesBefore[token.symbol] = (await erc20.balanceOf(deployer.address)) as bigint
  }

  const executorUsdcBefore = (await usdc.balanceOf(BUNDLE_EXECUTOR_ADDRESS)) as bigint

  const tx = await executor.executeBasket(BASKET_ID, swaps, { value: 0 })
  console.log('tx', tx.hash)
  const receipt = await tx.wait()

  const usdcAfter = (await usdc.balanceOf(deployer.address)) as bigint
  const usdcReceived = usdcAfter - usdcBefore
  console.log('User USDC balance (after):', ethers.formatUnits(usdcAfter, 6))
  console.log('USDC received:', ethers.formatUnits(usdcReceived, 6))
  if (usdcReceived <= 0n) throw new Error('Expected USDC balance to increase')

  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, ethers.provider)
    const after = (await erc20.balanceOf(deployer.address)) as bigint
    const spent = inputBalancesBefore[token.symbol] - after
    console.log(`${token.symbol} sold:`, spent.toString())
    if (spent <= 0n) throw new Error(`Expected ${token.symbol} balance to decrease`)
  }

  const executorUsdcAfter = (await usdc.balanceOf(BUNDLE_EXECUTOR_ADDRESS)) as bigint
  console.log('Executor USDC stranded:', executorUsdcAfter.toString())
  if (executorUsdcAfter > executorUsdcBefore) {
    throw new Error('USDC stranded in BundleExecutor')
  }

  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token.address, ERC20_ABI, ethers.provider)
    const stranded = (await erc20.balanceOf(BUNDLE_EXECUTOR_ADDRESS)) as bigint
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
