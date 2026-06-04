# PortX Contracts — Scripts

This folder intentionally contains **no deployment scripts**.

BundleExecutor is a planning draft only:

- **NOT audited**
- **NOT deployed**
- **NOT connected** to PortX frontend or backend

## Local development

From the `contracts/` directory:

```bash
npm install
npx hardhat compile
npx hardhat test
```

Or use npm scripts:

```bash
npm run compile
npm run test
```

## What is not included

- No `deploy.ts` / deploy tasks
- No Etherscan verify tasks
- No mainnet or testnet network configuration
- No private keys or `.env` requirements

All testing runs on the in-process **Hardhat** network (`chainId: 31337`).

Solidity sources live under `src/` (Hardhat excludes `node_modules` at the project root).
