import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { arbitrum, base, mainnet, polygon, sepolia } from 'wagmi/chains'
import { APP_NAME } from './constants'
import { SUPPORTED_CHAINS } from './chains'
import { getMainnetHttpTransport } from './rpc'

// Empty env var is common locally; RainbowKit maps YOUR_PROJECT_ID to its public example id.
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || 'YOUR_PROJECT_ID'

export const wagmiConfig = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: [...SUPPORTED_CHAINS],
  transports: {
    [mainnet.id]: getMainnetHttpTransport(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
})
