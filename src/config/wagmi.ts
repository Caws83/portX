import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { APP_NAME } from './constants'
import { SUPPORTED_CHAINS } from './chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'demo-project-id'

export const wagmiConfig = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: [...SUPPORTED_CHAINS],
  ssr: false,
})
