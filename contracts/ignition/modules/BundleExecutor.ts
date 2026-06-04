import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * BundleExecutorModule — Sepolia testnet deployment planning only.
 *
 * NOT audited. NOT deployed by default. No constructor arguments (v0 draft).
 * Do not connect to PortX frontend or backend until audit + product sign-off.
 */
const BundleExecutorModule = buildModule('BundleExecutorModule', (m) => {
  const bundleExecutor = m.contract('BundleExecutor')

  return { bundleExecutor }
})

export default BundleExecutorModule
