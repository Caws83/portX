# PortX BundleExecutor — Contract Architecture (Planning Only)

> **Status:** First draft · **NOT audited** · **NOT deployed** · **NOT connected to PortX Alpha**

This folder documents a future on-chain execution path for PortX basket trades. It does **not** change how the live app works today.

---

## Why BundleExecutor exists

PortX Alpha today:

- Fetches **live CoinGecko prices** and **live 0x quotes** via the backend
- Previews **buy** and **sell-all** baskets in the frontend
- Prepares **wallet execution** UI with safety checks and **dry-run simulation**
- Does **not** send on-chain transactions (`ENABLE_LIVE_EXECUTION` remains `false`)

Users still sign **one swap per leg** in the planned live path (0x calldata per token). That works for previews but is poor UX for multi-token baskets (many transactions, many gas overhead events).

**BundleExecutor** is a planning contract to eventually:

1. Accept a **single user transaction**
2. Loop **multiple router calls** (0x / other aggregators) inside one contract
3. Emit indexed **events** for analytics and portfolio reconciliation

---

## Current vs future flow

### Today (Alpha — unchanged)

```
User → PortX API (0x quotes) → Quote preview → Review modal → Dry-run simulation
                                                      ↓
                                            No on-chain execution
```

0x returns **router address + calldata** per leg. The frontend validates and simulates locally. No `BundleExecutor` involvement.

### Future (after audit + explicit product enablement)

```
User → PortX API (quotes) → Build SwapCall[] + minOut
         ↓
User approves ERC-20 (or sends ETH) → BundleExecutor.executeBasket()
         ↓
Contract calls external routers in one tx → SwapExecuted × N → BasketExecuted
```

---

## Files

| File | Purpose |
|------|---------|
| `BundleExecutor.sol` | Draft executor: multi-leg router calls, events, owner rescue, reentrancy guard |
| `interfaces/IERC20.sol` | Minimal ERC-20 interface for planning |

There is **no** deploy script, **no** Hardhat/Foundry project wiring, and **no** frontend/backend integration in this phase.

---

## BundleExecutor draft behavior

- **`executeBasket(basketId, swaps)`** — loops `SwapCall` structs:
  - `router` + `data` (external aggregator calldata, same shape as 0x preview today)
  - `tokenIn` / `amountIn` — ERC-20 via `transferFrom` or native ETH via `msg.value`
  - `minAmountOut` — **placeholder** (commented enforcement; must be implemented post-audit)
- **Events**
  - `SwapExecuted` — per leg
  - `BasketExecuted` — basket completion
- **Safety primitives (draft)**
  - `nonReentrant` guard
  - `onlyOwner` rescue for stuck ERC-20 / ETH
- **Explicit non-production comments** in source

---

## Security risks (non-exhaustive)

| Risk | Notes |
|------|--------|
| **Unaudited code** | Must not be deployed to mainnet without a professional audit |
| **Arbitrary router calls** | Malicious or wrong `router`/`data` can drain approved tokens |
| **Slippage not enforced** | `minAmountOut` is a placeholder in this draft |
| **Return data assumptions** | `_callRouter` decodes a single `uint256`; real routers differ |
| **Approval patterns** | ERC-20 `approve` per leg is naive; production should use Permit2 / forceApprove patterns |
| **ETH accounting** | Multi-leg ETH budgeting is simplified; edge cases need review |
| **Reentrancy** | Guard on `executeBasket` only; external routers may callback |
| **Owner centralization** | Rescue + ownership transfer are trusted admin functions |
| **Quote staleness** | On-chain contract cannot know if off-chain quote expired |

---

## Audit required before mainnet

Do **not** deploy `BundleExecutor.sol` to mainnet until:

1. Full slippage / settlement verification per router provider
2. Independent security audit
3. Formal threat model (MEV, malicious calldata, partial failure)
4. Incident response + pause / upgrade strategy
5. Legal / compliance review for your jurisdiction

---

## Not ready for production

- Not wired to `executionService.ts` or `TransactionReviewModal`
- Not wired to backend quote routes
- No deployment addresses
- No test suite in this repo phase
- Feature flag `ENABLE_LIVE_EXECUTION` must remain `false` until product + security sign-off

---

## Recommended next steps (in order)

1. **Foundry or Hardhat scaffold** — compile/test `BundleExecutor` in isolation (no deploy to mainnet)
2. **Unit tests** — revert paths, reentrancy, rescue, failed router calls
3. **Slippage design** — enforce `minAmountOut` per router response shape (0x-specific)
4. **Security audit** — before any testnet with real funds
5. **Backend `SwapCall` builder** — only after contract interface is frozen
6. **Frontend integration** — only after audit + `ENABLE_LIVE_EXECUTION` governance

---

## License

SPDX-License-Identifier: MIT (planning artifacts only).
