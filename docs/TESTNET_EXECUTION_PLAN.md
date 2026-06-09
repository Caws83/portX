# PortX — Testnet Execution Plan

> **Purpose:** Plan Sepolia-only `BundleExecutor.executeBasket()` integration **before** any write code lands.  
> **Status:** Planning only — **no live execution enabled** in Alpha v0.1.  
> **Companion docs:** [DEPLOYMENTS.md](./DEPLOYMENTS.md), [SEPOLIA_VERIFICATION_PLAN.md](./SEPOLIA_VERIFICATION_PLAN.md), [ALPHA_RELEASE_CHECKLIST.md](./ALPHA_RELEASE_CHECKLIST.md)  
> **Last updated:** 2026-05-29

**Hard rules until exit criteria are met**

- Do **not** enable live execution in production preview (`VITE_ENABLE_LIVE_EXECUTION=false` by default).
- Do **not** call `executeBasket()` from the app yet.
- Do **not** send transactions from PortX Alpha without explicit phased rollout approval.
- Do **not** modify backend quote routing or `BundleExecutor.sol` without a separate approved task.
- Do **not** commit `contracts/.env`, `.env`, or `contracts/ignition/deployments/`.

---

## 1. Current status

| Area | Status |
|------|--------|
| **BundleExecutor on Sepolia** | Deployed at `0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B` |
| **Etherscan verification** | Verified — [contract page](https://sepolia.etherscan.io/address/0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B#code) |
| **`owner()` read** | Works via public Sepolia RPC (`readContract`) when wallet is on Sepolia |
| **Live execution** | **Disabled** — `ENABLE_LIVE_EXECUTION` requires `VITE_ENABLE_LIVE_EXECUTION=true` |
| **Settings contract health** | Read-only UI: connected network, address, owner, reachable Yes/No |
| **Wallet network switcher** | Sepolia available alongside Ethereum, Arbitrum, Base, Polygon |
| **Backend** | Quote preview only — not wired to on-chain execution |
| **Contract audit** | **No** — planning draft only |

### What already exists (read path)

- `src/config/contracts.ts` — Sepolia BundleExecutor registry
- `src/services/bundleExecutorContract.ts` — read-only `owner()`, `chainId`, reachability probe
- `src/hooks/useBundleExecutorHealth.ts` — wallet-aware health states (disconnected / wrong network / ready)
- `src/pages/Settings.tsx` — BundleExecutor status + Contract Health sections
- `src/services/executionSafety.ts` — safety checks; **`canExecute` is always `false`** today
- `src/services/transactionBuilder.ts` — builds preview plans; demo calldata markers blocked for live prep

### What does not exist yet (write path)

- ERC-20 `approve()` flow to BundleExecutor
- `SwapCall[]` encoder aligned to on-chain struct
- `executeBasket(bytes32, SwapCall[])` wallet write service
- Testnet-only execution button (intentionally absent)
- Sepolia mock router for controlled first tests
- Post-tx event indexing / receipt verification UI

---

## 2. Execution flow (testnet only)

Target user journey once write code is approved — **Sepolia only**:

```
Quote Preview
    ↓
Transaction Review (safety checks + leg summary)
    ↓
Build SwapCall[] (one struct per leg)
    ↓
User confirms (explicit modal + testnet warnings)
    ↓
Wallet signs (approve per ERC-20 leg if needed, then executeBasket)
    ↓
BundleExecutor.executeBasket(basketId, swaps)
    ↓
Receipt + events (SwapExecuted, BasketExecuted) for verification
```

### Step detail

| Step | Owner | Notes |
|------|-------|-------|
| Quote Preview | Existing UI + backend/local quotes | Unchanged for Phase B; testnet may use mock quotes first |
| Transaction Review | `TransactionReviewModal` + `executionSafety` | Must show BLOCKED until all gates pass |
| Build `SwapCall[]` | New frontend service (planned) | Map quote legs → contract struct fields |
| User confirms | Modal | Separate from wallet signature; show max test amount |
| Approvals | Wallet | One `approve` per distinct `tokenIn` (ERC-20 legs) |
| `executeBasket` | Wallet → Sepolia BundleExecutor | Single payable tx; native ETH legs via `msg.value` |
| Verification | Settings / tx link | Etherscan receipt, event logs, owner rescue awareness |

### Explicit non-goals for testnet v1

- Mainnet execution
- Multi-chain BundleExecutor routing
- Backend-signed or relayer-submitted transactions
- Automatic retry of failed legs inside one basket

---

## 3. Required data per swap leg

`BundleExecutor.SwapCall` (Solidity) maps to frontend encoding:

| Field | Type | Source (planned) | Notes |
|-------|------|------------------|-------|
| `router` | `address` | Quote `routerAddress` | Must be non-zero, validated checksum |
| `data` | `bytes` | Quote `calldata` | Full router calldata from quote API or mock router |
| `tokenIn` | `address` | Quote sell token | `address(0)` for native ETH |
| `amountIn` | `uint256` | Quote sell amount (wei) | Must match approval / `msg.value` budget |
| `minAmountOut` | `uint256` | Slippage-adjusted min | **Placeholder in contract today** — enforce off-chain pre-submit |
| `tokenOut` | `address` | Quote buy token | Indexing only in draft; not verified on-chain |

### Basket-level fields

| Field | Type | Source |
|-------|------|--------|
| `basketId` | `bytes32` | Hash of plan id + timestamp or stable plan UUID |
| `msg.value` | `uint256` | Sum of native ETH `amountIn` across legs |

### Validation before encode

- Reject demo calldata markers (`_DEMO_`, `_DEMO_CALLDATA`)
- Reject unsupported providers
- Reject legs where `amountIn` exceeds testnet max limit
- Ensure `tokenIn` / `tokenOut` / `router` are valid addresses
- Slippage ≤ configured max (e.g. 300 bps in `executionSafety`)

---

## 4. Required safety gates

All gates must pass before any execute button is enabled. Proposed AND logic:

| # | Gate | Env / check | Fail behavior |
|---|------|-------------|---------------|
| G1 | Testnet app mode | `VITE_APP_MODE=testnet` | Block — production preview must not execute |
| G2 | Live execution flag | `VITE_ENABLE_LIVE_EXECUTION=true` | Block — default `false` |
| G3 | Wallet connected | `useAccount().isConnected` | Show "Wallet not connected" |
| G4 | Sepolia chain | `chainId === 11155111` | Show "Wrong network" |
| G5 | Contract reachable | `fetchBundleExecutorReadStatus()` success | Block — RPC / address failure |
| G6 | User confirmation | Explicit modal confirm | No auto-submit |
| G7 | Max test amount | Config cap (e.g. ≤ 0.01 ETH equivalent per basket) | Block with message |
| G8 | No mainnet execution | `chainId !== 1` and no mainnet BundleExecutor address | Hard block |
| G9 | Calldata quality | No demo markers; router + calldata valid | Block — missing calldata |
| G10 | Slippage cap | ≤ `MAX_EXECUTION_SLIPPAGE_BPS` | Block |

### Recommended env matrix

| Environment | `VITE_APP_MODE` | `VITE_ENABLE_LIVE_EXECUTION` | Execute allowed |
|-------------|-----------------|------------------------------|-----------------|
| Production preview (Netlify default) | `production` | `false` | **No** |
| Local dev (read-only) | `production` | `false` | **No** |
| Sepolia write experiments | `testnet` | `true` | **Only after Phase C exit criteria** |

### Mainnet guardrail

Even if `VITE_ENABLE_LIVE_EXECUTION=true`, execution service must **refuse** when:

- `chainId === 1` (Ethereum mainnet), or
- Target contract is not the Sepolia BundleExecutor address in `src/config/contracts.ts`

---

## 5. First test — no real 0x routes

**Do not** use live 0x mainnet-style routes for the first Sepolia write test.

### Why

- 0x calldata is chain- and router-specific; Sepolia liquidity differs from mainnet
- Mis-encoded calldata causes `RouterCallFailed` and can strand tokens in BundleExecutor
- Production quote backend is not in scope for testnet execution wiring

### Recommended first route: mock / controlled router

| Approach | Description |
|----------|-------------|
| **Mock router contract** | Deploy simple Sepolia contract that accepts `tokenIn` + returns fixed `tokenOut` or echoes swap |
| **Controlled test token pair** | Mintable ERC-20 on Sepolia; router swaps at 1:1 for testing |
| **Hardcoded calldata fixture** | Known-good `router` + `data` from manual `cast send` rehearsal |

### Mock test checklist

- [ ] Mock router deployed on Sepolia (address recorded in private runbook)
- [ ] `executeBasket` with **one leg** succeeds on Sepolia
- [ ] `SwapExecuted` and `BasketExecuted` events visible on Etherscan
- [ ] No tokens stuck in BundleExecutor after success path
- [ ] Owner `rescueERC20` / `rescueETH` documented for failure drills

Only after mock router passes → consider tiny-value real aggregator routes (Phase D).

---

## 6. Risks

| Risk | Impact | Mitigation (planned) |
|------|--------|----------------------|
| **ERC-20 approvals** | User grants BundleExecutor spend rights | Approve exact `amountIn` per leg; document revoke flow |
| **Router calldata** | Wrong `data` → `RouterCallFailed(i)` | Mock router first; validate calldata off-chain; no demo markers |
| **Failed swaps** | Partial basket failure reverts whole tx (atomic) | Pre-flight simulation (`eth_call`); small test amounts |
| **Stuck tokens** | Tokens or ETH left in BundleExecutor | Owner rescue functions exist — **not** user-callable; document ops process |
| **Unaudited contract** | Unknown exploit or logic bug | Sepolia only; low caps; no mainnet; professional audit before Phase E |
| **`minAmountOut` not enforced on-chain** | Slippage not protected in contract v0 | Enforce in UI + quote layer; note in review modal |
| **Reentrancy / router trust** | Malicious router callback | Contract has `nonReentrant`; only allowlisted routers in test plan |
| **User error (wrong network)** | Tx sent to wrong chain | Gate on `11155111`; prominent testnet banners |

---

## 7. Phased rollout

### Phase A — Read-only checks ✅ (complete)

- [x] BundleExecutor deployed and verified on Sepolia
- [x] Contract config in frontend
- [x] Settings: address, verification, live execution disabled
- [x] Contract Health: network, owner, reachable
- [x] Sepolia in wallet switcher
- [x] No `executeBasket()` calls from app

### Phase B — Write service scaffold (no button)

**Goal:** Land encoding + wallet write helpers behind flags; UI button stays disabled.

Planned work (future PRs):

- `bundleExecutorWrite.ts` — encode `SwapCall[]`, estimate gas, `simulateContract`
- Extend `executionSafety` with testnet-specific gates (G1–G10)
- Transaction Review shows encoded payload preview
- Feature flag: button renders **disabled** with "Testnet execution not enabled"

**Exit:** Build passes; no user-facing execute path; code review confirms no accidental sends.

### Phase C — Mock router on Sepolia

**Goal:** End-to-end `executeBasket` with controlled mock router only.

- Deploy / record mock router on Sepolia
- Single-leg basket from PortX testnet mode
- Manual test wallet with Sepolia ETH + test tokens
- Verify events and balances on Etherscan

**Exit:** Mock basket succeeds 3× consecutively; failure recovery documented.

### Phase D — Tiny value swaps

**Goal:** Real aggregator calldata on Sepolia with strict caps.

- Increase complexity: multi-leg baskets (2–3 legs max)
- Max test amount enforced (e.g. ≤ 0.01 ETH equivalent)
- Receipt UI + link to Sepolia Etherscan
- Log failures with leg index

**Exit:** Team sign-off on test logs; no stuck funds without owner rescue.

### Phase E — Mainnet (out of scope)

**Not approved for Alpha v0.1.**

Requires:

- Professional audit of `BundleExecutor`
- Mainnet deployment decision
- Separate mainnet safety policy
- Product + legal sign-off

---

## 8. Exit criteria (before enabling any execute button)

All must be true before a **enabled** testnet execute control ships:

| # | Criterion | Owner |
|---|-----------|-------|
| E1 | Dev team contract review complete (`BundleExecutor.sol` + write service) | Engineering |
| E2 | Mock router test on Sepolia passes (Phase C) | Engineering |
| E3 | Sepolia execution logs verified (`SwapExecuted`, `BasketExecuted`, receipt status) | Engineering |
| E4 | No mainnet flags or addresses in execution path | Engineering |
| E5 | `VITE_ENABLE_LIVE_EXECUTION` remains `false` in production Netlify env | DevOps |
| E6 | Max test amount limit implemented and tested | Engineering |
| E7 | Failure runbook written (stuck tokens, rescue, user messaging) | Engineering + ops |
| E8 | Explicit product approval for Phase D only | Product |

**Until E1–E8:** execute button must remain **disabled** or hidden.

---

## 9. Planned file touchpoints (reference — not implemented)

Future write work will likely touch **frontend only** (backend unchanged per current scope):

| File | Planned change |
|------|----------------|
| `src/services/bundleExecutorWrite.ts` | **New** — encode + simulate + send (gated) |
| `src/services/bundleExecutorContract.ts` | Add ABI entries for `executeBasket` (simulate only first) |
| `src/services/executionSafety.ts` | Testnet gates; conditional `canExecute` |
| `src/services/transactionBuilder.ts` | `buildSwapCallsFromPlan()` |
| `src/components/TransactionReviewModal.tsx` | Testnet confirm + disabled/enabled button |
| `src/config/features.ts` | Optional `MAX_TESTNET_BASKET_WEI` |
| `src/hooks/useBundleExecutorHealth.ts` | Reuse reachable check in write gate |

**Not in scope:** `backend/`, `contracts/src/BundleExecutor.sol`, `package.json`

---

## 10. Testing procedure (when Phase B+ begins)

### Local prep

```bash
# .env (local only — do not commit)
VITE_APP_MODE=testnet
VITE_ENABLE_LIVE_EXECUTION=true
VITE_WALLETCONNECT_PROJECT_ID=<your_id>
```

```bash
npm run build
npm run dev
```

### Manual test (Phase C mock)

1. Connect wallet; switch to **Sepolia**
2. Settings → Contract Health: **Reachable: Yes**, owner populated
3. Run mock basket flow (once UI exists)
4. Confirm modal → approve test token → sign `executeBasket`
5. Verify tx on Sepolia Etherscan
6. Confirm events and balances

### Regression checks

- Production mode (`VITE_APP_MODE=production`, `VITE_ENABLE_LIVE_EXECUTION=false`): no execute path
- Wrong network: blocked
- Disconnected wallet: blocked

---

## 11. Related links

| Resource | URL |
|----------|-----|
| Sepolia BundleExecutor | https://sepolia.etherscan.io/address/0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B#code |
| Deployment tx | https://sepolia.etherscan.io/tx/0xd51002352cafc5f6b19dcfef20e9e43e7394dedbce7dfe0af065c4b7e9f0cc82 |
| Deployments registry | [DEPLOYMENTS.md](./DEPLOYMENTS.md) |
| Verification plan | [SEPOLIA_VERIFICATION_PLAN.md](./SEPOLIA_VERIFICATION_PLAN.md) |

---

## Summary

PortX has a **verified, readable** Sepolia BundleExecutor and read-only contract health in Settings. The next work is **planned** testnet execution behind strict flags, starting with a **mock router** — not live 0x routes. No execute button should ship until Phase C mock tests and exit criteria E1–E8 are satisfied. Mainnet execution remains out of scope until audit and explicit approval.
