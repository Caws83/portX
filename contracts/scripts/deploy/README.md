# Sepolia deployment (scaffold only)

> **Do not run deployment until you intend to use Sepolia test ETH.**  
> This repo ships **commands only** — nothing is deployed automatically.

## Safety

- **Never commit** `.env`, `DEPLOYER_PRIVATE_KEY`, or API keys
- **Sepolia testnet only** — no mainnet configuration in this scaffold
- **Not audited** — `BundleExecutor` is a planning draft
- **No production** — PortX Alpha must keep `ENABLE_LIVE_EXECUTION=false`
- **No frontend/backend wiring** from this step

---

## 1. Set `.env`

From the `contracts/` directory:

```bash
cp .env.example .env
```

Fill in (testnet only):

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DEPLOYER_PRIVATE_KEY=0x...your_testnet_deployer_key...
ETHERSCAN_API_KEY=your_etherscan_api_key
```

Use a **dedicated testnet wallet** with Sepolia ETH only.

---

## 2. Compile

```bash
npm install
npm run build
```

(`npm run build` runs `hardhat compile`.)

---

## 3. Run tests (local Hardhat network)

```bash
npx hardhat test
```

All tests must pass before any testnet deploy.

---

## 4. Dry-run deployment (review plan — no broadcast)

Preview the Ignition deployment graph:

```bash
npx hardhat ignition visualize ignition/modules/BundleExecutor.ts
```

Optional: validate module against Sepolia without committing to a deployment id you care about (review CLI output carefully; cancel if unsure):

```bash
npx hardhat ignition deploy ignition/modules/BundleExecutor.ts --network sepolia --deployment-id portx-sepolia-preview
```

> Stop before confirming if you only want a dry-run. Prefer `visualize` when you need zero chain interaction.

---

## 5. Deploy to Sepolia

When audit checklist and testnet funding are ready:

```bash
npx hardhat ignition deploy ignition/modules/BundleExecutor.ts --network sepolia --deployment-id portx-sepolia
```

Record the deployed `BundleExecutor` address from the Ignition output.  
Do **not** add it to the PortX frontend or backend until integration is explicitly approved.

---

## Verify on Etherscan (after deploy)

See [../verify/README.md](../verify/README.md).

---

## What this does not do

- No mainnet deploy
- No PortX API or UI changes
- No live swap execution
- No automatic CI deployment
