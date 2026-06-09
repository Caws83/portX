import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * MockERC20Module — Sepolia Phase C test token deployment (manual only).
 *
 * Deploys contracts/src/mocks/MockERC20.sol (mintable ERC-20 for router drills).
 * NOT wired to PortX frontend. Run only when explicitly executing:
 *   npm run deploy:sepolia:mock-erc20
 */
const MockERC20Module = buildModule('MockERC20Module', (m) => {
  const name = m.getParameter('name', 'PortX Mock USDC')
  const symbol = m.getParameter('symbol', 'mUSDC')
  const decimals = m.getParameter('decimals', 6)

  const mockErc20 = m.contract('MockERC20', [name, symbol, decimals])

  return { mockErc20 }
})

export default MockERC20Module
