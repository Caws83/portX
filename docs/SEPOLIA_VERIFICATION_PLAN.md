# PortX — Sepolia Deployment Verification Plan

> **Purpose:** Verify a Sepolia `BundleExecutor` deploy **after** you run deployment manually — not a deploy guide.  
> **Companion:** [SEPOLIA_DEPLOY_CHECKLIST.md](./SEPOLIA_DEPLOY_CHECKLIST.md) (pre-deploy steps)  
> **Last updated:** 2026-05-29 · Alpha v0.1 · **NOT audited**

**Rules for this plan**

- Do **not** enable PortX live execution (`VITE_ENABLE_LIVE_EXECUTION=false`).
- Do **not** commit `contracts/.env` or private keys.
- Testnet wallet execution experiments are **out of scope** until exit criteria below are met.

Record all values in a **private runbook** (not git).

---

## Verification record (fill after deploy)

| Field | Value |
|-------|-------|
| Network | Sepolia (`11155111`) |
| Deployment ID | `portx-sepolia` |
| Deploy date | |
| Deployer EOA | `0x________________________________` |
| Deployment tx hash | `0x________________________________` |
| BundleExecutor address | `0x________________________________` |
| Etherscan contract URL | |
| Verified on Etherscan | ☐ Yes ☐ No |
| Owner (`owner()`) | `0x________________________________` |
| Verified by | |

---

## 1. Pre-deploy checks

Complete **before** broadcasting Ignition deploy. No on-chain deploy until all are checked.

| # | Check | Command / action | Pass criteria |
|---|-------|------------------|---------------|
| P1 | `contracts/.env` configured | File at `contracts/.env` (not repo root) | `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY` set; file **not** in `git status` |
| P2 | Sepolia ETH funded | [Sepolia Etherscan](https://sepolia.etherscan.io/) → deployer address | Balance &gt; 0; enough for deploy + verify |
| P3 | Hardhat tests passing | `cd contracts && npx hardhat test` | **15 passing** |
| P4 | Build passing | `cd contracts && npm run build` | `hardhat compile` succeeds |
| P5 | App builds (optional gate) | `npm run build` + `cd backend && npm run build` | Exit `0` — confirms Alpha unchanged |
| P6 | Ignition plan reviewed | `npx hardhat ignition visualize ignition/modules/BundleExecutor.ts` | Single `BundleExecutor` deploy, no constructor args |
| P7 | Live execution off | Netlify + local `.env` | `VITE_ENABLE_LIVE_EXECUTION=false` |

**Pre-deploy sign-off:** ☐ All P1–P7 complete

---

## 2. Deployment verification

Run **immediately after** `npx hardhat ignition deploy ... --network sepolia`.

### 2a. Deployment transaction

| # | Check | How | Record |
|---|-------|-----|--------|
| D1 | Deployment tx hash | Ignition CLI output or Sepolia Etherscan → deployer | `0x...` |
| D2 | Tx succeeded | Etherscan status **Success** | Block number: |
| D3 | Contract created | Internal tx / contract creation in receipt | |

### 2b. Deployed address

| # | Check | How | Expected |
|---|-------|-----|----------|
| D4 | BundleExecutor address | Ignition summary / `deployed_addresses` in `ignition/deployments/portx-sepolia/` | `0x...` (42-char checksummed) |
| D5 | Code at address | `cast code <ADDRESS> --rpc-url $SEPOLIA_RPC_URL` or Etherscan **Contract** tab | Non-empty bytecode |
| D6 | Chain ID | Etherscan header | **11155111** (Sepolia) |

### 2c. Contract verified on Etherscan

```powershell
cd contracts
npx hardhat ignition verify portx-sepolia --network sepolia
```

| # | Check | Pass criteria |
|---|-------|---------------|
| D7 | Source verified | Etherscan shows green check **Contract Source Code Verified** |
| D8 | Compiler match | Solidity **0.8.20**, optimizer **200 runs** (per `hardhat.config.ts`) |
| D9 | Constructor args | **None** (empty constructor) |

### 2d. Owner address verified

`BundleExecutor` sets `owner = msg.sender` in constructor.

| # | Check | How | Expected |
|---|-------|-----|----------|
| D10 | `owner()` on-chain | Etherscan **Read Contract** → `owner` or cast call | Equals **deployer EOA** from Ignition |
| D11 | Deployer match | Compare to `DEPLOYER_PRIVATE_KEY` derived address | Same address |

```bash
# Example (foundry cast — optional)
cast call <BUNDLE_EXECUTOR_ADDRESS> "owner()(address)" --rpc-url $SEPOLIA_RPC_URL
```

**Deployment verification sign-off:** ☐ D1–D11 complete

---

## 3. Post-deploy checks

On-chain reads and **optional** owner-only smoke (Sepolia test funds only).  
**Do not** call `executeBasket` with real router calldata until audit + integration exit criteria.

### 3a. Read `owner()`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Etherscan → Contract → Read → `owner` | Deployer address |
| 2 | After any `transferOwnership` test, re-read | Updated owner only if you intentionally transferred |

### 3b. Verify contract bytecode

| Step | Action | Expected |
|------|--------|----------|
| 1 | Compare local artifact hash to deployed | `contracts/artifacts/src/BundleExecutor.sol/BundleExecutor.json` deployed bytecode matches on-chain (optional `cast codesize`) |
| 2 | Etherscan verified source matches git commit | Tag commit SHA in runbook: |

### 3c. Verify events (ABI)

Confirm Etherscan **Events** tab lists:

| Event | Indexed fields |
|-------|----------------|
| `SwapExecuted` | `basketId`, `legIndex`, `router` |
| `BasketExecuted` | `basketId`, `executor`, `initiator` |

Full test of event emission requires a controlled `executeBasket` call on Sepolia (see exit criteria — not required for deploy verification alone).

### 3d. Verify rescue functions (read + optional write)

**Read-only (Etherscan / cast)**

| Function | Access | Notes |
|----------|--------|-------|
| `rescueERC20(token, to, amount)` | `onlyOwner` | Reverts `InvalidRecipient` if `to == 0` |
| `rescueETH(to, amount)` | `onlyOwner` | Same |
| `transferOwnership(newOwner)` | `onlyOwner` | Reverts if `newOwner == 0` |

**Optional Sepolia smoke (owner wallet, test tokens only)**

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | Send small Sepolia ETH to contract (`receive()` enabled) | Balance &gt; 0 |
| 2 | Owner calls `rescueETH(owner, amount)` | ETH returned to owner; tx succeeds |
| 3 | Non-owner calls `rescueETH` | Reverts `NotOwner()` |

Do **not** test `executeBasket` on mainnet routers until audit and PortX integration are approved.

**Post-deploy sign-off:** ☐ 3a–3d complete (3c execute path deferred per exit criteria)

---

## 4. PortX integration checklist

Document placeholders only — **no code changes** in Alpha v0.1.

| # | Item | Status (Alpha v0.1) | Future placeholder |
|---|------|---------------------|-------------------|
| I1 | Contract address documented | ☐ Private runbook | Not in public repo until integration PR |
| I2 | Frontend config | **Not wired** | Future: `VITE_BUNDLE_EXECUTOR_SEPOLIA=0x...` (not in codebase today) |
| I3 | Backend config | **Not wired** | Future: `BUNDLE_EXECUTOR_SEPOLIA=0x...` in Railway (not in codebase today) |
| I4 | `VITE_APP_MODE` | `production` or `testnet` scaffold | Testnet mode does not switch wallet to Sepolia yet |
| I5 | `VITE_ENABLE_LIVE_EXECUTION` | **Must stay `false`** | Netlify + local `.env` |
| I6 | Quote API | Ethereum mainnet 0x only | Sepolia quotes not routed in Alpha backend |
| I7 | UI | Preview / dry-run only | No “Execute on Sepolia” button in Alpha |

**Integration sign-off:** ☐ Address recorded privately · ☐ Live execution confirmed disabled · ☐ No accidental env commit

---

## 5. Exit criteria

**Requirements before testnet wallet execution testing** (calling `executeBasket` or PortX-signed swaps against Sepolia `BundleExecutor`):

| # | Criterion | Required |
|---|-----------|----------|
| E1 | Pre-deploy checks P1–P7 | ✅ |
| E2 | Deployment verification D1–D11 | ✅ |
| E3 | Post-deploy read checks 3a, 3b, 3d (read) | ✅ |
| E4 | Etherscan source verified (D7–D9) | ✅ |
| E5 | Contract **audit** completed or explicit testnet-only risk acceptance | ✅ |
| E6 | Dedicated Sepolia test wallet funded (separate from mainnet) | ✅ |
| E7 | Mock-router or controlled Sepolia `executeBasket` test plan written | ✅ |
| E8 | PortX integration env placeholders agreed (I2–I3) in a **future** PR | ✅ |
| E9 | `VITE_ENABLE_LIVE_EXECUTION` remains `false` until feature-flagged testnet path exists | ✅ |
| E10 | Production smoke test gate still valid | [PRODUCTION_SMOKE_TEST.md](./PRODUCTION_SMOKE_TEST.md) |

### Gate decision

| State | Meaning |
|-------|---------|
| **DEPLOY VERIFIED** | E1–E4 complete — contract exists and is verified on Sepolia |
| **READY FOR TESTNET EXEC EXPERIMENTS** | E1–E10 complete — may proceed to controlled `executeBasket` / wallet tests |
| **BLOCKED** | Any FAIL on D7, D10, or E5 |

---

## Quick command reference

```powershell
# Pre-deploy
cd contracts
npm run build
npx hardhat test

# Deploy (manual — when ready)
npx hardhat ignition deploy ignition/modules/BundleExecutor.ts --network sepolia --deployment-id portx-sepolia

# Verify
npx hardhat ignition verify portx-sepolia --network sepolia

# Read owner (replace address)
cast call <ADDRESS> "owner()(address)" --rpc-url $env:SEPOLIA_RPC_URL
```

---

## Related docs

- [SEPOLIA_DEPLOY_CHECKLIST.md](./SEPOLIA_DEPLOY_CHECKLIST.md)
- [contracts/scripts/deploy/README.md](../contracts/scripts/deploy/README.md)
- [contracts/scripts/verify/README.md](../contracts/scripts/verify/README.md)
- [ALPHA_RELEASE_CHECKLIST.md](./ALPHA_RELEASE_CHECKLIST.md)
- [SMOKE_TEST_RUNNER.md](./SMOKE_TEST_RUNNER.md)
