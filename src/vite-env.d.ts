/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_PORTX_API_URL?: string
  readonly VITE_ENABLE_DEMO_QUOTES?: string
  readonly VITE_ZEROX_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
