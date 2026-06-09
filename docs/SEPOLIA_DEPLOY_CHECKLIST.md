# PortX — Sepolia Deployment Readiness Checklist

> **Status:** Ready to deploy **when you choose** — nothing in this repo auto-deploys.  
> **Last verified:** 2026-05-29 · Contracts package · `BundleExecutor` v0 draft  
> **Scope:** Sepolia testnet only · **NOT audited** · **NOT** wired to PortX Alpha UI/API

**Do not proceed to mainnet.** PortX Alpha must keep `VITE_ENABLE_LIVE_EXECUTION=false`.

---

## Readiness summary (automated checks)

| Check | Result |
|-------|--------|
| `contracts/.env.example` ↔ `hardhat.config.ts` env vars | ✅ Match (`SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY`) |
| `contracts/.gitignore` ignores `.env` | ✅ |
| Sepolia network (`chainId: 11155111`) | ✅ |
| Etherscan config (Sepolia API key) | ✅ |
| Solidity compile (`npm run build`) | ✅ |
| Hardhat tests (`npx hardhat test`) | ✅ **15 / 15 passing** |
| Ignition module `BundleExecutor.ts` | ✅ Visualizes; deploys `BundleExecutor` (no constructor args) |

---

## 1. Create a dedicated testnet wallet

- [ ] New wallet used **only** for Sepolia (not your mainnet funds wallet)
- [ ] Export private key securely — store in password manager, never in git
- [ ] Record address: `0x________________________________`

**Never** reuse a mainnet hot wallet key.

---

## 2. Get Sepolia ETH

- [ ] Fund deployer address from a Sepolia faucet, e.g.:
  - [https://sepoliafaucet.com/](https://sepoliafaucet.com/)
  - [https://www.alchemy.com/faucets/ethereum-sepolia](https://www.alchemy.com/faucets/ethereum-sepolia)
- [ ] Confirm balance on [Sepolia Etherscan](https://sepolia.etherscan.io/)

Minimum: enough for one contract deploy + a few verification txs (varies with gas).

---

## 3. Fill `contracts/.env`

**Location (required):** `contracts/.env` — **not** repo root, **not** `backend/.env`.

```powershell
cd contracts
# If missing: copy from example
cp .env.example .env
```

Edit `contracts/.env` (testnet values only):

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DEPLOYER_PRIVATE_KEY=0x...your_testnet_key...
ETHERSCAN_API_KEY=your_etherscan_api_key
```

| Variable | Used by |
|----------|---------|
| `SEPOLIA_RPC_URL` | `hardhat.config.ts` → `networks.sepolia.url` |
| `DEPLOYER_PRIVATE_KEY` | `networks.sepolia.accounts` |
| `ETHERSCAN_API_KEY` | `etherscan.apiKey.sepolia` |

- [ ] `.env` exists at `contracts/.env`
- [ ] **Not** committed (`contracts/.gitignore` lists `.env`)
- [ ] `git status` does not show `contracts/.env` as staged

---

## 4. Run tests (mandatory before deploy)

From `contracts/`:

```powershell
npm install
npm run build
npx hardhat test
```

| Expect | |
|--------|---|
| Compile | `hardhat compile` succeeds (or “Nothing to compile”) |
| Tests | **15 passing** |

- [ ] All 15 tests pass locally

---

## 5. Review deployment plan (optional, no broadcast)

```powershell
npx hardhat ignition visualize ignition/modules/BundleExecutor.ts
```

Opens `contracts/cache/visualization/index.html` — single `BundleExecutor` contract, no constructor parameters.

- [ ] Reviewed Ignition graph

---

## 6. Deploy to Sepolia (manual — you run this)

**Only when audit/funding checklist above is done.**

```powershell
cd contracts
npx hardhat ignition deploy ignition/modules/BundleExecutor.ts --network sepolia --deployment-id portx-sepolia
```

- [ ] Confirmed deployer has Sepolia ETH
- [ ] Recorded deployed address from CLI output
- [ ] Did **not** enable live execution in the app

**Deployment ID:** `portx-sepolia` (change only if you intend multiple deployments)

---

## 7. Verify on Etherscan

After successful deploy:

```powershell
npx hardhat ignition verify portx-sepolia --network sepolia
```

Or manual (no constructor args):

```powershell
npx hardhat verify --network sepolia <BUNDLE_EXECUTOR_ADDRESS>
```

- [ ] Contract verified on Sepolia Etherscan
- [ ] Explorer link saved

---

## 8. Save contract address

Record in your **private** runbook (not committed secrets):

| Field | Value |
|-------|-------|
| Network | Sepolia (`11155111`) |
| Contract | `BundleExecutor` |
| Address | `0x________________________________` |
| Deployment ID | `portx-sepolia` |
| Deploy date | |
| Deployer | `0x________________________________` |
| Etherscan | `https://sepolia.etherscan.io/address/0x...` |

**Do not** add the address to frontend/backend env until integration is explicitly approved.

---

## 9. Update documentation (after deploy)

- [ ] Note address in private ops doc / password manager attachment
- [ ] Update team runbook with deployment ID and verify status
- [ ] Optional: add **deployed** section to `contracts/README.md` in a future PR (address only, no keys)
- [ ] Re-run [SMOKE_TEST_RUNNER.md](./SMOKE_TEST_RUNNER.md) — app behavior unchanged until integration

---

## Hardhat configuration reference

| Item | Value |
|------|-------|
| Solidity | `0.8.20`, optimizer 200 runs |
| Sources | `contracts/src/` |
| Tests | `contracts/test/BundleExecutor.test.ts` |
| Sepolia chain ID | `11155111` |
| Ignition module | `ignition/modules/BundleExecutor.ts` |
| Mainnet | **Not configured** (intentional) |

---

## Safety gates (do not skip)

| Gate | Requirement |
|------|-------------|
| Audit | Professional audit **not** done — deploy is testnet experimentation only |
| Live execution | `VITE_ENABLE_LIVE_EXECUTION=false` in Netlify and local `.env` |
| App wiring | No frontend/backend changes from deploy step alone |
| Keys | Never commit `contracts/.env` or private keys |
| Funds | Sepolia ETH only — no mainnet deploy in this scaffold |

---

## Blockers before production / Beta execution

1. **Contract audit** not completed  
2. **Frontend/backend** not integrated with deployed address  
3. **Feature-flagged execution** not implemented for testnet  
4. **Token coverage** and quote routing still Ethereum-mainnet focused in Alpha API  

---

## Related docs

- [contracts/scripts/deploy/README.md](../contracts/scripts/deploy/README.md) — deploy commands  
- [contracts/scripts/verify/README.md](../contracts/scripts/verify/README.md) — Etherscan verify  
- [contracts/README.md](../contracts/README.md) — architecture draft  
- [ALPHA_RELEASE_CHECKLIST.md](./ALPHA_RELEASE_CHECKLIST.md) — Alpha gate  
- [PRODUCTION_SMOKE_TEST.md](./PRODUCTION_SMOKE_TEST.md) — production smoke gate  
