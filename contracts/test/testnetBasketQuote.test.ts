import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { BundleExecutor, MockERC20, MockRouter } from '../typechain-types'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

const BASKET_ID = ethers.id('portx-multi-token-basket')
const ROUTER_FAIL_INDEX = ethers.MaxUint256

describe('testnet basket quote math', () => {
  function splitAmounts(total: bigint, weights: number[]): bigint[] {
    if (weights.length === 0) return []
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
    const amounts: bigint[] = []
    let allocated = 0n

    for (let index = 0; index < weights.length; index++) {
      if (index === weights.length - 1) {
        amounts.push(total - allocated)
        continue
      }
      const share =
        (total * BigInt(Math.round(weights[index] * 100))) /
        BigInt(Math.round(weightSum * 100))
      amounts.push(share)
      allocated += share
    }

    return amounts
  }

  it('splits ETH across four allocation weights without dust loss', () => {
    const total = ethers.parseEther('0.0001')
    const amounts = splitAmounts(total, [40, 30, 20, 10])
    expect(amounts).to.have.length(4)
    expect(amounts.reduce((sum, value) => sum + value, 0n)).to.equal(total)
    expect(amounts[0]).to.be.greaterThan(amounts[1])
    expect(amounts[1]).to.be.greaterThan(amounts[2])
    expect(amounts[2]).to.be.greaterThan(amounts[3])
  })

  it('splits USDC notionals across four legs', () => {
    const total = 1_000_000n
    const amounts = splitAmounts(total, [40, 30, 20, 10])
    expect(amounts.reduce((sum, value) => sum + value, 0n)).to.equal(total)
    expect(amounts[0]).to.equal(400_000n)
    expect(amounts[1]).to.equal(300_000n)
    expect(amounts[2]).to.equal(200_000n)
    expect(amounts[3]).to.equal(100_000n)
  })
})

describe('BundleExecutor multi-token basket', () => {
  async function deployMultiTokenFixture() {
    const [owner, user, other] = await ethers.getSigners()

    const BundleExecutor = await ethers.getContractFactory('BundleExecutor')
    const executor = (await BundleExecutor.deploy()) as BundleExecutor

    const MockRouter = await ethers.getContractFactory('MockRouter')
    const linkRouter = (await MockRouter.deploy()) as MockRouter
    const uniRouter = (await MockRouter.deploy()) as MockRouter
    const wethRouter = (await MockRouter.deploy()) as MockRouter
    const aaveRouter = (await MockRouter.deploy()) as MockRouter

    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const link = (await MockERC20.deploy('Mock LINK', 'mLINK', 18)) as MockERC20
    const uni = (await MockERC20.deploy('Mock UNI', 'mUNI', 18)) as MockERC20
    const weth = (await MockERC20.deploy('Mock WETH', 'mWETH', 18)) as MockERC20
    const aave = (await MockERC20.deploy('Mock AAVE', 'mAAVE', 18)) as MockERC20

    const routers = [linkRouter, uniRouter, wethRouter, aaveRouter]
    for (const router of routers) {
      await executor.connect(owner).setRouterAllowed(await router.getAddress(), true)
    }
    await executor.connect(owner).setRouterAllowed(other.address, false)

    return { executor, routers, link, uni, weth, aave, owner, user, other }
  }

  async function configureOutput(
    router: MockRouter,
    token: MockERC20,
    returnAmount: bigint,
  ) {
    const routerAddr = await router.getAddress()
    await router.setReturnAmount(returnAmount)
    await router.setOutputToken(await token.getAddress())
    await router.setTransferOutputToOrigin(true)
    await token.mint(routerAddr, returnAmount * 10n)
  }

  function buildEthSwap(
    router: string,
    amountIn: bigint,
    tokenOut: string,
    minAmountOut: bigint,
  ) {
    return {
      router,
      data: '0x',
      tokenIn: ethers.ZeroAddress,
      amountIn,
      minAmountOut,
      tokenOut,
    }
  }

  it('executes a four-leg multi-token basket to the user wallet', async () => {
    const { executor, routers, link, uni, weth, aave, user } = await loadFixture(
      deployMultiTokenFixture,
    )
    const linkAddr = await link.getAddress()
    const uniAddr = await uni.getAddress()
    const wethAddr = await weth.getAddress()
    const aaveAddr = await aave.getAddress()

    const outputs = [40n, 30n, 20n, 10n]
    const tokens = [link, uni, weth, aave]
    for (let index = 0; index < tokens.length; index++) {
      await configureOutput(routers[index], tokens[index], outputs[index])
    }

    const amounts = [
      ethers.parseEther('0.00004'),
      ethers.parseEther('0.00003'),
      ethers.parseEther('0.00002'),
      ethers.parseEther('0.00001'),
    ]
    const totalEth = amounts.reduce((sum, value) => sum + value, 0n)

    const swaps = [
      buildEthSwap(await routers[0].getAddress(), amounts[0], linkAddr, outputs[0]),
      buildEthSwap(await routers[1].getAddress(), amounts[1], uniAddr, outputs[1]),
      buildEthSwap(await routers[2].getAddress(), amounts[2], wethAddr, outputs[2]),
      buildEthSwap(await routers[3].getAddress(), amounts[3], aaveAddr, outputs[3]),
    ]

    const executorAddr = await executor.getAddress()
    const before = {
      link: await link.balanceOf(user.address),
      uni: await uni.balanceOf(user.address),
      weth: await weth.balanceOf(user.address),
      aave: await aave.balanceOf(user.address),
      executorLink: await link.balanceOf(executorAddr),
    }

    await executor.connect(user).executeBasket(BASKET_ID, swaps, { value: totalEth })

    expect(await link.balanceOf(user.address)).to.equal(before.link + outputs[0])
    expect(await uni.balanceOf(user.address)).to.equal(before.uni + outputs[1])
    expect(await weth.balanceOf(user.address)).to.equal(before.weth + outputs[2])
    expect(await aave.balanceOf(user.address)).to.equal(before.aave + outputs[3])
    expect(await link.balanceOf(executorAddr)).to.equal(before.executorLink)
  })

  it('reverts when one leg fails slippage in a multi-token basket', async () => {
    const { executor, routers, link, uni, user } = await loadFixture(deployMultiTokenFixture)
    await configureOutput(routers[0], link, 100n)
    await configureOutput(routers[1], uni, 50n)

    const swaps = [
      buildEthSwap(await routers[0].getAddress(), 10n, await link.getAddress(), 100n),
      buildEthSwap(await routers[1].getAddress(), 10n, await uni.getAddress(), 999n),
    ]

    await expect(
      executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 20n }),
    ).to.be.revertedWithCustomError(executor, 'SlippageExceeded')
  })

  it('reverts when router is not allowlisted for a multi-token basket', async () => {
    const { executor, user, other } = await loadFixture(deployMultiTokenFixture)
    const swaps = [
      buildEthSwap(other.address, 10n, ethers.Wallet.createRandom().address, 0n),
    ]

    await expect(
      executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 10n }),
    ).to.be.revertedWithCustomError(executor, 'RouterNotAllowed')
      .withArgs(other.address)
  })

  it('reverts when a router call fails mid-basket (partial failure)', async () => {
    const { executor, routers, link, user } = await loadFixture(deployMultiTokenFixture)
    await configureOutput(routers[0], link, 100n)

    const swaps = [
      buildEthSwap(await routers[0].getAddress(), 10n, await link.getAddress(), 100n),
      buildEthSwap(await routers[1].getAddress(), 10n, await link.getAddress(), 100n),
    ]

    await routers[1].setShouldFail(true)

    await expect(
      executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 20n }),
    ).to.be.revertedWithCustomError(executor, 'RouterCallFailed')
      .withArgs(ROUTER_FAIL_INDEX)
  })
})
