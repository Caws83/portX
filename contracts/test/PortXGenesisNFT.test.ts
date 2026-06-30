import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { PortXGenesisNFT } from '../typechain-types'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

const METADATA_URI = 'ipfs://test-metadata-cid'
const MINT_PRICE = ethers.parseEther('0.02')
const MAX_SUPPLY = 10_000n

describe('PortXGenesisNFT', () => {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners()

    const Factory = await ethers.getContractFactory('PortXGenesisNFT')
    const nft = (await Factory.deploy(
      owner.address,
      'PortX Genesis NFT',
      'PORTX',
      METADATA_URI,
      MINT_PRICE,
      MAX_SUPPLY,
    )) as PortXGenesisNFT

    return { nft, owner, user }
  }

  it('deploys with correct owner', async () => {
    const { nft, owner } = await loadFixture(deployFixture)

    expect(await nft.owner()).to.equal(owner.address)
    expect(await nft.maxSupply()).to.equal(MAX_SUPPLY)
    expect(await nft.mintPrice()).to.equal(MINT_PRICE)
    expect(await nft.metadataURI()).to.equal(METADATA_URI)
    expect(await nft.goPublic()).to.equal(false)
  })

  it('rejects max supply above absolute cap at deploy and via setMaxSupply', async () => {
    const [owner] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory('PortXGenesisNFT')

    await expect(
      Factory.deploy(
        owner.address,
        'PortX Genesis NFT',
        'PORTX',
        METADATA_URI,
        MINT_PRICE,
        250_001n,
      ),
    ).to.be.revertedWith('Above absolute max')

    const { nft } = await loadFixture(deployFixture)

    await expect(nft.setMaxSupply(250_001n)).to.be.revertedWith('Above absolute max')
  })

  it('blocks public mint before goPublic', async () => {
    const { nft, user } = await loadFixture(deployFixture)

    await expect(
      nft.connect(user).mintNFT(user.address, 1, { value: MINT_PRICE }),
    ).to.be.revertedWith('Public mint not live')
  })

  it('allows owner to setGoPublic(true)', async () => {
    const { nft, owner } = await loadFixture(deployFixture)

    await expect(nft.connect(owner).setGoPublic(true))
      .to.emit(nft, 'GoPublicSet')
      .withArgs(true)

    expect(await nft.goPublic()).to.equal(true)
  })

  it('public mint works with correct ETH after goPublic', async () => {
    const { nft, owner, user } = await loadFixture(deployFixture)

    await nft.connect(owner).setGoPublic(true)

    await expect(nft.connect(user).mintNFT(user.address, 1, { value: MINT_PRICE }))
      .to.emit(nft, 'NFTMinted')
      .withArgs(user.address, 1n, 0)

    expect(await nft.balanceOf(user.address)).to.equal(1n)
    expect(await nft.totalSupply()).to.equal(1n)
  })

  it('whitelist mint works once', async () => {
    const { nft, owner, user } = await loadFixture(deployFixture)

    await nft.connect(owner).addFreeWhitelistUserOrAddMoreSpots(user.address, 1)

    expect(await nft.whitelisted(user.address)).to.equal(true)
    expect(await nft.howMany(user.address)).to.equal(1n)

    await expect(nft.connect(user).whiteMint())
      .to.emit(nft, 'NFTMinted')
      .withArgs(user.address, 1n, 0)

    expect(await nft.balanceOf(user.address)).to.equal(1n)
    expect(await nft.whitelisted(user.address)).to.equal(false)
    expect(await nft.howMany(user.address)).to.equal(0n)

    await expect(nft.connect(user).whiteMint()).to.be.revertedWith('Not whitelisted')
  })

  it('ownerMint works', async () => {
    const { nft, owner, user } = await loadFixture(deployFixture)

    await expect(nft.connect(owner).ownerMint(user.address, 2))
      .to.emit(nft, 'NFTMinted')
      .withArgs(user.address, 1n, 0)

    expect(await nft.balanceOf(user.address)).to.equal(2n)
    expect(await nft.totalSupply()).to.equal(2n)
  })
})
