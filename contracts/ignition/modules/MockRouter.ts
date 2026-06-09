import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * MockRouterModule — Sepolia Phase C mock router deployment (manual only).
 *
 * Deploys contracts/src/mocks/MockRouter.sol for controlled executeBasket() tests.
 * NOT wired to PortX frontend. Run only when explicitly executing:
 *   npm run deploy:sepolia:mock-router
 */
const MockRouterModule = buildModule('MockRouterModule', (m) => {
  const mockRouter = m.contract('MockRouter')

  return { mockRouter }
})

export default MockRouterModule
