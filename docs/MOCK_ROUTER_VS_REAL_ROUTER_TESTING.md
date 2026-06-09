# PortX — Mock Router vs Real Router Testing (Sepolia)

> **Purpose:** Explain why a **Sepolia mock router contract** is a required safety gate before Uniswap, 0x, or any live aggregator route on testnet.  
> **Status:** Planning only — **no deployment, no app changes** in this document.  
> **Companion docs:** [TESTNET_EXECUTION_PLAN.md](./TESTNET_EXECUTION_PLAN.md), [DEPLOYMENTS.md](./DEPLOYMENTS.md), [SEPOLIA_VERIFICATION_PLAN.md](./SEPOLIA_VERIFICATION_PLAN.md)  
> **Last updated:** 2026-05-29

---

## Critical distinction: mock router ≠ app mock data

PortX uses **two different meanings of “mock”** that must not be confused.

| Term | What it is | Where it lives | Purpose |
|------|------------|----------------|---------|
| **App mock / demo data** | Placeholder quotes, `_DEMO_` calldata markers, `isDemo` plans | Frontend (`VITE_ENABLE_DEMO_QUOTES`, quote providers) | UI preview when APIs are unavailable — **no on-chain execution** |
| **Mock router (test contract)** | A **deployed Sepolia Solidity contract** that behaves like an external DEX router | On-chain (`MockRouter` + optional `MockERC20`) | Controlled `executeBasket()` integration test — **real wallet txs on testnet** |

**This document is about the second item:** an on-chain test contract deployed to Sepolia, not frontend demo quotes.

The Phase B `buildSwapCalls()` scaffold and Transaction Review payload preview validate **structure** only. They do not replace a real Sepolia `executeBasket()` rehearsal with a known-good router address and calldata.

---

## Why mock router testing is a safety gate

`BundleExecutor.executeBasket()` is an **orchestration** contract. It does not decode swap logic — it loops `SwapCall[]`, transfers tokens, approves routers, and `call`s external `data`. Most execution risk sits in:

1. **BundleExecutor loop** — reentrancy guard, ETH accounting, `transferFrom`, approvals, refunds
2. **External router** — calldata correctness, liquidity, token addresses, revert behavior

Testing (2) with Uniswap or 0x **before** proving (1) works hides failures. A bad router call can look like a BundleExecutor bug, strand tokens, or waste Sepolia ETH debugging the wrong layer.

A **mock router on Sepolia** isolates layer (1):

- Fixed, auditable swap behavior (e.g. 1:1 mint/burn, echo swap, or revert on command)
- Known `router` address and **known-good calldata** from manual `cast send` or Hardhat script
- No dependency on aggregator APIs, Sepolia liquidity depth, or mainnet-style quote routing

Only after the mock router path passes should PortX attempt Uniswap/0x Sepolia routes.

---

## What mock router testing proves

Phase C goal ([TESTNET_EXECUTION_PLAN.md](./TESTNET_EXECUTION_PLAN.md)): end-to-end `executeBasket` with a **controlled** router only.

### Must verify on Sepolia

| Check | What it validates |
|-------|-------------------|
| **Single-leg basket** | `executeBasket` succeeds with one `SwapCall` |
| **Multi-leg basket (optional)** | Loop completes; leg index matches events |
| **`SwapExecuted` events** | `basketId`, `legIndex`, `router`, `tokenIn`, `tokenOut`, `amountIn`, `amountOut` |
| **`BasketExecuted` event** | `legCount`, `initiator`, `timestamp` |
| **Native ETH leg** | `tokenIn == address(0)`, `msg.value` accounting, refund of unused ETH |
| **ERC-20 leg** | User `approve` → `transferFrom` → router `approve` → router call → approval reset |
| **Failure path** | Mock router `revert` → whole tx reverts (`RouterCallFailed`); no partial state corruption |
| **Stuck funds drill** | Document owner `rescueERC20` / `rescueETH` if a failed experiment leaves balance in BundleExecutor |

### What it does **not** prove

- Real slippage protection (`minAmountOut` is not enforced on-chain in draft v0)
- Production aggregator calldata quality
- Mainnet safety or economic correctness

---

## Why Uniswap / 0x Sepolia testing comes later

Real routers add variables mock testing deliberately removes:

| Requirement | Real router (Uniswap / 0x / aggregator) |
|-------------|----------------------------------------|
| **Calldata** | Must match exact router ABI and pool/route encoding — wrong bytes → `RouterCallFailed` |
| **Token addresses** | Sepolia token registry differs from mainnet; addresses in quotes must be chain-correct |
| **Liquidity** | Pools may be empty or illiquid on Sepolia; quotes can succeed off-chain but fail on-chain |
| **Approvals** | Spender may be allowance-holder, router, or permit2 — must match quote target |
| **API / backend** | 0x and similar routes assume live quote freshness; stale calldata reverts |
| **Debugging cost** | Failures blend router, token, and executor issues — hard to bisect |

PortX Alpha today routes **mainnet** quotes for preview; Sepolia execution is a **separate** path. Jumping straight to Uniswap/0x on Sepolia before mock router success risks:

- Tokens stuck in `BundleExecutor` (`0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B`)
- False negatives on unaudited executor logic
- Engineering time lost on aggregator-specific failures unrelated to PortX loop correctness

**Mock router reduces risk** by proving the executor loop, events, and fund flows with deterministic on-chain behavior.

---

## Recommended testing order

Execute in sequence. Do not skip steps without written justification in a private runbook.

| Step | Target | Network | Gate |
|------|--------|---------|------|
| **1** | **MockRouter** | Sepolia | Deploy minimal router; known `swap()` / `execute()` entry; scripted calldata |
| **2** | **MockERC20** | Sepolia | Mintable test tokens for `tokenIn` / `tokenOut`; no mainnet asset addresses |
| **3** | **Uniswap (or compatible AMM) route** | Sepolia | Real pool + real calldata; tiny amounts; verify events still index correctly |
| **4** | **0x / aggregator testnet route** | Sepolia | Only if aggregator supports Sepolia and returns valid calldata; strict caps |
| **5** | **Mainnet** | Ethereum | **Only after professional audit** — out of scope for Alpha v0.1 |

### Step 1–2 detail (mock stack)

Planned artifacts (not deployed yet):

- `MockRouter.sol` — accepts ERC-20 or ETH; returns predictable `amountOut`; optional `shouldRevert` flag for failure drills
- `MockERC20.sol` — `mint(to, amount)` for test wallet funding
- Private runbook entries: contract addresses, sample `SwapCall[]`, tx hashes, event log screenshots

### Step 3–4 detail (real routers)

Prerequisites before enabling any PortX UI execute button for real routers:

- Steps 1–2 passed **3× consecutively** (per [TESTNET_EXECUTION_PLAN.md](./TESTNET_EXECUTION_PLAN.md) Phase C exit)
- `VITE_APP_MODE=testnet` and `VITE_ENABLE_LIVE_EXECUTION=true` **local only** — never on production Netlify default
- Max test basket cap enforced (e.g. ≤ 0.01 ETH equivalent)
- Sepolia wallet only (`chainId: 11155111`)
- No demo calldata (`_DEMO_` markers rejected by `bundleExecutorWrite.ts`)

### Step 5 (mainnet)

Explicitly **blocked** until:

- `BundleExecutor` professional audit
- Mainnet deployment decision and ops runbook
- Product sign-off separate from testnet experiments

---

## Relationship to current PortX app state

| Layer | Status (Alpha v0.1) |
|-------|---------------------|
| BundleExecutor Sepolia | Deployed, verified, read-only health in Settings |
| `buildSwapCalls()` / payload preview | Phase B — validation scaffold in Transaction Review |
| App demo quotes | Unrelated to mock router — preview only |
| `executeBasket()` from app | **Not enabled** |
| MockRouter / MockERC20 on Sepolia | **Not deployed** — next infrastructure step |

Frontend “demo mode” and backend demo quotes help **product preview**. They do **not** satisfy Phase C. Phase C requires **deployed Sepolia test contracts** and manual or gated wallet transactions outside production preview defaults.

---

## Exit criteria before real router testing (summary)

From [TESTNET_EXECUTION_PLAN.md](./TESTNET_EXECUTION_PLAN.md) — abbreviated:

- [ ] Mock router deployed on Sepolia (address in private runbook)
- [ ] `executeBasket` single-leg success with mock calldata
- [ ] `SwapExecuted` + `BasketExecuted` verified on Etherscan
- [ ] ETH and ERC-20 legs both exercised
- [ ] Failure path (mock revert) documented
- [ ] No stuck funds without documented rescue procedure
- [ ] Dev team review of executor + write service complete

**Only then:** proceed to Uniswap Sepolia (step 3), then aggregator testnet (step 4).

---

## Related links

| Resource | URL |
|----------|-----|
| Sepolia BundleExecutor | https://sepolia.etherscan.io/address/0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B#code |
| Testnet execution plan | [TESTNET_EXECUTION_PLAN.md](./TESTNET_EXECUTION_PLAN.md) |
| Deployments registry | [DEPLOYMENTS.md](./DEPLOYMENTS.md) |

---

## Summary

A **mock router** is a **Sepolia test contract**, not PortX frontend mock data. It proves `BundleExecutor` can safely loop swaps, emit events, and handle ETH/ERC-20 flows before introducing Uniswap, 0x, or other live routers that demand real calldata, valid token addresses, liquidity, and approvals. Follow the ordered path: MockRouter → MockERC20 → Uniswap Sepolia → aggregator testnet → mainnet only after audit.
