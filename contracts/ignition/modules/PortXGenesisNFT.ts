import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { parseEther } from 'ethers'

/**
 * PortXGenesisNFTModule — Sepolia Genesis NFT deployment (manual only).
 *
 * Run only when explicitly deploying:
 *   npm run testnet:deploy-nft
 *
 * TODO: Replace initialMetadataURI with the real IPFS CID before mainnet-adjacent launch.
 */
const PortXGenesisNFTModule = buildModule('PortXGenesisNFTModule', (m) => {
  const deployer = m.getAccount(0)

  const name = m.getParameter('name', 'PortX Genesis NFT')
  const symbol = m.getParameter('symbol', 'PORTX')
  // TODO: upload metadata JSON + image to IPFS and replace REPLACE_WITH_METADATA_CID
  const initialMetadataURI = m.getParameter(
    'initialMetadataURI',
    'ipfs://REPLACE_WITH_METADATA_CID',
  )
  const initialMintPrice = m.getParameter('initialMintPrice', parseEther('0.02'))
  const initialMaxSupply = m.getParameter('initialMaxSupply', 10_000n)

  const portxGenesisNft = m.contract('PortXGenesisNFT', [
    deployer,
    name,
    symbol,
    initialMetadataURI,
    initialMintPrice,
    initialMaxSupply,
  ])

  return { portxGenesisNft }
})

export default PortXGenesisNFTModule
