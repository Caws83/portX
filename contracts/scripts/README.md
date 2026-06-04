# PortX Contracts — Scripts

| Path | Purpose |
|------|---------|
| [deploy/README.md](./deploy/README.md) | Sepolia Ignition deploy steps (commands only — not run in CI) |
| [verify/README.md](./verify/README.md) | Etherscan verify on Sepolia after deploy |

BundleExecutor is a planning draft only:

- **NOT audited**
- **NOT deployed** by default
- **NOT connected** to PortX frontend or backend
- **Sepolia testnet only** — no mainnet config

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

## Environment

Copy `contracts/.env.example` → `contracts/.env` for Sepolia RPC, deployer key, and Etherscan API key.  
**Never commit** `.env` or private keys.

## What is not included

- No mainnet network
- No automatic deployment in CI
- No PortX live execution enablement

Local tests use the in-process **Hardhat** network (`chainId: 31337`).

Solidity sources live under `src/` (Hardhat excludes `node_modules` at the project root).
