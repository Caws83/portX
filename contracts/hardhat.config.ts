import type { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-ignition-ethers'
import * as dotenv from 'dotenv'

dotenv.config()

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
const sepoliaRpc = process.env.SEPOLIA_RPC_URL ?? ''

/**
 * Hardhat config: local tests + Sepolia testnet scaffold only.
 * No mainnet. No automatic deployment.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: sepoliaRpc,
      chainId: 11155111,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}

export default config
