import { expect } from 'chai'
import { ethers } from 'hardhat'
import type {
  BundleExecutor,
  InvalidDataRouter,
  MockERC20,
  MockRouter,
  ReentrancyRouter,
} from '../typechain-types'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

const BASKET_ID = ethers.id('portx-test-basket')
const ROUTER_FAIL_INDEX = ethers.MaxUint256

describe('BundleExecutor', () => {
  async function deployFixture() {
    const [owner, user, other] = await ethers.getSigners()

    const BundleExecutor = await ethers.getContractFactory('BundleExecutor')
    const executor = (await BundleExecutor.deploy()) as BundleExecutor

    const MockRouter = await ethers.getContractFactory('MockRouter')
    const router = (await MockRouter.deploy()) as MockRouter
    await router.setReturnAmount(1_000n)

    const MockERC20 = await ethers.getContractFactory('MockERC20')
    const token = (await MockERC20.deploy('Mock USDC', 'mUSDC', 6)) as MockERC20
    await token.mint(user.address, 1_000_000n)

    const outputToken = (await MockERC20.deploy('Mock OUT', 'mOUT', 6)) as MockERC20

    const ReentrancyRouter = await ethers.getContractFactory('ReentrancyRouter')
    const reentrancyRouter = (await ReentrancyRouter.deploy()) as ReentrancyRouter
    await reentrancyRouter.configure(await executor.getAddress(), BASKET_ID)

    const InvalidDataRouter = await ethers.getContractFactory('InvalidDataRouter')
    const invalidRouter = (await InvalidDataRouter.deploy()) as InvalidDataRouter

    const routerAddr = await router.getAddress()
    const reentrancyAddr = await reentrancyRouter.getAddress()
    const invalidAddr = await invalidRouter.getAddress()

    await executor.connect(owner).setRouterAllowed(routerAddr, true)
    await executor.connect(owner).setRouterAllowed(reentrancyAddr, true)
    await executor.connect(owner).setRouterAllowed(invalidAddr, true)

    return {
      executor,
      router,
      token,
      outputToken,
      reentrancyRouter,
      invalidRouter,
      owner,
      user,
      other,
    }
  }

  async function configureRouterOutput(
    router: MockRouter,
    outputToken: MockERC20,
    returnAmount: bigint,
  ) {
    const routerAddr = await router.getAddress()
    await router.setReturnAmount(returnAmount)
    await router.setOutputToken(await outputToken.getAddress())
    await router.setTransferOutputToOrigin(true)
    await outputToken.mint(routerAddr, returnAmount * 10n)
  }

  function buildEthSwap(
    router: string,
    amountIn: bigint,
    tokenOut: string,
    minAmountOut = 0n,
    data = '0x'
  ) {
    return {
      router,
      data,
      tokenIn: ethers.ZeroAddress,
      amountIn,
      minAmountOut,
      tokenOut,
    }
  }

  function buildErc20Swap(
    router: string,
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    minAmountOut = 0n,
    data = '0x'
  ) {
    return {
      router,
      data,
      tokenIn,
      amountIn,
      minAmountOut,
      tokenOut,
    }
  }

  describe('ownership', () => {
    it('assigns deployer as owner', async () => {
      const { executor, owner } = await loadFixture(deployFixture)
      expect(await executor.owner()).to.equal(owner.address)
    })

    it('transfers ownership', async () => {
      const { executor, owner, other } = await loadFixture(deployFixture)
      await executor.connect(owner).transferOwnership(other.address)
      expect(await executor.owner()).to.equal(other.address)
    })

    it('reverts ownership transfer from non-owner', async () => {
      const { executor, user, other } = await loadFixture(deployFixture)
      await expect(executor.connect(user).transferOwnership(other.address)).to.be.revertedWithCustomError(
        executor,
        'NotOwner'
      )
    })

    it('reverts ownership transfer to zero address', async () => {
      const { executor, owner } = await loadFixture(deployFixture)
      await expect(
        executor.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(executor, 'InvalidRecipient')
    })
  })

  describe('router allowlist', () => {
    it('allows owner to set router allowlist', async () => {
      const { executor, owner, other } = await loadFixture(deployFixture)
      await expect(executor.connect(owner).setRouterAllowed(other.address, true))
        .to.emit(executor, 'RouterAllowlistUpdated')
        .withArgs(other.address, true)
      expect(await executor.allowedRouters(other.address)).to.equal(true)
    })

    it('reverts when router is not allowlisted', async () => {
      const { executor, user, other } = await loadFixture(deployFixture)
      const swaps = [buildEthSwap(other.address, 1n, ethers.Wallet.createRandom().address)]
      await expect(
        executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 1n })
      ).to.be.revertedWithCustomError(executor, 'RouterNotAllowed')
        .withArgs(other.address)
    })

    it('reverts allowlist update from non-owner', async () => {
      const { executor, user, other } = await loadFixture(deployFixture)
      await expect(
        executor.connect(user).setRouterAllowed(other.address, true)
      ).to.be.revertedWithCustomError(executor, 'NotOwner')
    })
  })

  describe('rescue', () => {
    it('rescues ERC20 to owner', async () => {
      const { executor, token, owner, user } = await loadFixture(deployFixture)
      await token.mint(await executor.getAddress(), 500n)
      await executor.connect(owner).rescueERC20(await token.getAddress(), owner.address, 500n)
      expect(await token.balanceOf(owner.address)).to.equal(500n)
      expect(await token.balanceOf(await executor.getAddress())).to.equal(0n)
      await expect(
        executor.connect(user).rescueERC20(await token.getAddress(), owner.address, 1n)
      ).to.be.revertedWithCustomError(executor, 'NotOwner')
    })

    it('rescues ETH to owner', async () => {
      const { executor, owner, user } = await loadFixture(deployFixture)
      const amount = ethers.parseEther('0.5')
      await owner.sendTransaction({ to: await executor.getAddress(), value: amount })
      await executor.connect(owner).rescueETH(owner.address, amount)
      await expect(executor.connect(user).rescueETH(owner.address, 1n)).to.be.revertedWithCustomError(
        executor,
        'NotOwner'
      )
    })

    it('reverts rescue to zero address', async () => {
      const { executor, owner } = await loadFixture(deployFixture)
      await expect(
        executor.connect(owner).rescueETH(ethers.ZeroAddress, 1n)
      ).to.be.revertedWithCustomError(executor, 'InvalidRecipient')
    })
  })

  describe('reentrancy', () => {
    it('blocks executeBasket when reentrancy guard is active', async () => {
      const { executor, user } = await loadFixture(deployFixture)
      const executorAddr = await executor.getAddress()
      // storage slot 2 = _reentrancyStatus (slot 0 = owner, slot 1 = allowedRouters); 2 = _ENTERED
      await ethers.provider.send('hardhat_setStorageAt', [
        executorAddr,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        ethers.zeroPadValue(ethers.toBeHex(2), 32),
      ])
      await expect(
        executor.connect(user).executeBasket(BASKET_ID, [])
      ).to.be.revertedWithCustomError(executor, 'ReentrancyGuardActive')
    })

    it('fails closed when router attempts nested executeBasket', async () => {
      const { executor, reentrancyRouter, user } = await loadFixture(deployFixture)
      const swaps = [buildEthSwap(await reentrancyRouter.getAddress(), 1n, ethers.ZeroAddress)]
      await expect(
        executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 1n })
      ).to.be.revertedWithCustomError(executor, 'RouterCallFailed')
    })
  })

  describe('executeBasket', () => {
    it('reverts on empty basket', async () => {
      const { executor, user } = await loadFixture(deployFixture)
      await expect(executor.connect(user).executeBasket(BASKET_ID, [])).to.be.revertedWithCustomError(
        executor,
        'EmptyBasket'
      )
    })

    it('reverts when router call fails', async () => {
      const { executor, router, user } = await loadFixture(deployFixture)
      await router.setShouldFail(true)
      const swaps = [buildEthSwap(await router.getAddress(), ethers.parseEther('0.01'), ethers.ZeroAddress)]
      await expect(
        executor.connect(user).executeBasket(BASKET_ID, swaps, {
          value: ethers.parseEther('0.01'),
        })
      ).to.be.revertedWithCustomError(executor, 'RouterCallFailed')
        .withArgs(ROUTER_FAIL_INDEX)
    })

    it('reverts on invalid swap data', async () => {
      const { executor, invalidRouter, user } = await loadFixture(deployFixture)
      const swaps = [
        buildEthSwap(
          await invalidRouter.getAddress(),
          1n,
          ethers.ZeroAddress,
          0n,
          '0xdeadbeef'
        ),
      ]
      await expect(
        executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 1n })
      ).to.be.revertedWithCustomError(executor, 'RouterCallFailed')
        .withArgs(ROUTER_FAIL_INDEX)
    })

    it('reverts when slippage exceeded', async () => {
      const { executor, router, outputToken, user } = await loadFixture(deployFixture)
      const returnAmount = 100n
      await configureRouterOutput(router, outputToken, returnAmount)
      const routerAddr = await router.getAddress()
      const tokenOut = await outputToken.getAddress()
      const swaps = [buildEthSwap(routerAddr, 10n, tokenOut, returnAmount + 1n)]

      await expect(
        executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 10n })
      ).to.be.revertedWithCustomError(executor, 'SlippageExceeded')
    })

    it('emits SwapExecuted and BasketExecuted for single ETH leg', async () => {
      const { executor, router, outputToken, user } = await loadFixture(deployFixture)
      const returnAmount = 2_500n
      await configureRouterOutput(router, outputToken, returnAmount)
      const routerAddr = await router.getAddress()
      const amountIn = ethers.parseEther('0.1')
      const tokenOut = await outputToken.getAddress()
      const swaps = [buildEthSwap(routerAddr, amountIn, tokenOut, returnAmount)]

      const tx = await executor.connect(user).executeBasket(BASKET_ID, swaps, { value: amountIn })
      await expect(tx)
        .to.emit(executor, 'SwapExecuted')
        .withArgs(BASKET_ID, 0n, routerAddr, ethers.ZeroAddress, tokenOut, amountIn, returnAmount)
      await expect(tx).to.emit(executor, 'BasketExecuted')

      const receipt = await tx.wait()
      const basketLog = receipt!.logs
        .map((log) => {
          try {
            return executor.interface.parseLog(log as { topics: string[]; data: string })
          } catch {
            return null
          }
        })
        .find((p) => p?.name === 'BasketExecuted')
      expect(basketLog?.args.basketId).to.equal(BASKET_ID)
      expect(basketLog?.args.initiator).to.equal(user.address)
      expect(basketLog?.args.legCount).to.equal(1n)
    })

    it('delivers outputs to user wallet (not executor)', async () => {
      const { executor, router, outputToken, user } = await loadFixture(deployFixture)
      const returnAmount = 5_000n
      await configureRouterOutput(router, outputToken, returnAmount)
      const routerAddr = await router.getAddress()
      const tokenOut = await outputToken.getAddress()
      const executorAddr = await executor.getAddress()
      const swaps = [buildEthSwap(routerAddr, 10n, tokenOut, returnAmount)]

      const userBefore = await outputToken.balanceOf(user.address)
      const executorBefore = await outputToken.balanceOf(executorAddr)

      await executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 10n })

      expect(await outputToken.balanceOf(user.address)).to.equal(userBefore + returnAmount)
      expect(await outputToken.balanceOf(executorAddr)).to.equal(executorBefore)
    })

    it('executes multiple swap legs (ETH + ERC20) with outputs to user', async () => {
      const { executor, router, token, outputToken, user } = await loadFixture(deployFixture)
      const returnAmount = 100n
      await configureRouterOutput(router, outputToken, returnAmount)
      const routerAddr = await router.getAddress()
      const tokenAddr = await token.getAddress()
      const tokenOut = await outputToken.getAddress()
      const erc20Amount = 1_000n
      const ethAmount = ethers.parseEther('0.05')

      await token.connect(user).approve(await executor.getAddress(), erc20Amount)

      const swaps = [
        buildEthSwap(routerAddr, ethAmount, tokenOut, returnAmount),
        buildErc20Swap(routerAddr, tokenAddr, erc20Amount, tokenOut, returnAmount),
      ]

      const userOutBefore = await outputToken.balanceOf(user.address)
      const executorOutBefore = await outputToken.balanceOf(await executor.getAddress())

      await expect(executor.connect(user).executeBasket(BASKET_ID, swaps, { value: ethAmount }))
        .to.emit(executor, 'SwapExecuted')
        .withArgs(BASKET_ID, 0n, routerAddr, ethers.ZeroAddress, tokenOut, ethAmount, returnAmount)
        .and.to.emit(executor, 'SwapExecuted')
        .withArgs(BASKET_ID, 1n, routerAddr, tokenAddr, tokenOut, erc20Amount, returnAmount)
        .and.to.emit(executor, 'BasketExecuted')

      expect(await outputToken.balanceOf(user.address)).to.equal(userOutBefore + returnAmount * 2n)
      expect(await outputToken.balanceOf(await executor.getAddress())).to.equal(executorOutBefore)
    })

    it('reports accurate balance delta in SwapExecuted event', async () => {
      const { executor, router, outputToken, user } = await loadFixture(deployFixture)
      const expectedOut = 42_000n
      await configureRouterOutput(router, outputToken, expectedOut)
      const tokenOut = await outputToken.getAddress()
      const swaps = [buildEthSwap(await router.getAddress(), 10n, tokenOut, expectedOut)]

      const tx = await executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 10n })
      const receipt = await tx.wait()
      const swapLog = receipt!.logs.find(
        (log) => executor.interface.parseLog(log as { topics: string[]; data: string })?.name === 'SwapExecuted'
      )
      const parsed = executor.interface.parseLog(swapLog as { topics: string[]; data: string })
      expect(parsed?.args[6]).to.equal(expectedOut)
      expect(await outputToken.balanceOf(user.address)).to.equal(expectedOut)
    })

    it('sweeps stranded ERC20 output from executor to user', async () => {
      const { executor, router, outputToken, user, owner } = await loadFixture(deployFixture)
      const returnAmount = 3_000n
      await router.setReturnAmount(returnAmount)
      await router.setOutputToken(await outputToken.getAddress())
      await router.setTransferOutputToOrigin(false)
      const routerAddr = await router.getAddress()
      const tokenOut = await outputToken.getAddress()
      const executorAddr = await executor.getAddress()

      await outputToken.mint(routerAddr, returnAmount)
      await outputToken.mint(executorAddr, returnAmount)

      const swaps = [buildEthSwap(routerAddr, 10n, tokenOut, returnAmount)]

      const userBefore = await outputToken.balanceOf(user.address)
      await executor.connect(user).executeBasket(BASKET_ID, swaps, { value: 10n })

      expect(await outputToken.balanceOf(user.address)).to.equal(userBefore + returnAmount)
      expect(await outputToken.balanceOf(executorAddr)).to.equal(0n)
    })
  })
})
