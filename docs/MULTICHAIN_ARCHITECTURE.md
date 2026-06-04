# PortX Multi-Chain Basket Architecture

This document describes the planned evolution of PortX baskets across chains. **No multi-chain swaps, bridges, or live cross-chain execution are implemented yet.** Today, production quotes remain **Ethereum mainnet only** via 0x (see `backend/src/config/supportedTokens.ts`).

---

## Design principles

- **Non-custodial** — users always sign from their wallet; PortX never holds keys or funds.
- **Single-chain first** — each basket is scoped to one chain until Phase 3+.
- **Explicit unsupported states** — tokens or chains without a router return clear status, not broken calldata.
- **Server-side routing keys** — aggregator and bridge API keys stay on the backend.
- **Live execution stays gated** — `ENABLE_LIVE_EXECUTION` remains off until deliberately enabled per chain.

---

## Phase 1 — Single-chain baskets only (current direction)

One basket = one chain. Quotes and execution prep use that chain’s native DEX aggregator(s).

| Chain | Status | Example basket tokens | Router (planned / current) |
|-------|--------|----------------------|----------------------------|
| **Ethereum** | Active (quotes) | ETH, WBTC, USDC, LINK, UNI, AAVE, PEPE | **0x** (live quotes today) |
| **Base** | Planned | ETH, USDC, cbBTC, AERO, VIRTUAL | 0x / Aerodrome routing |
| **Avalanche** | Planned | AVAX, USDC, JOE, GMX (if supported) | 0x / Trader Joe |
| **Solana** | Planned | SOL, USDC, JUP, RAY, BONK | Jupiter |

### Ethereum basket (reference)

Canonical Phase 1 Ethereum basket symbols for demos and docs:

- ETH
- WBTC
- USDC
- LINK
- UNI
- AAVE
- PEPE

Routing: filtered through `supportedTokens.ts`; unsupported demo tokens (SOL, TAO, NEAR, placeholders) return `provider: "unsupported"`.

### Base basket (planned)

- ETH
- USDC
- cbBTC
- AERO
- VIRTUAL

Chain ID `8453`. Router evaluation: 0x on Base, with Aerodrome as a supplemental liquidity source where needed.

### Avalanche basket (planned)

- AVAX
- USDC
- JOE
- GMX (if supported on C-Chain and routable)

Chain ID `43114`. Confirm GMX v2 / router availability before marking quote-supported.

### Solana basket (planned)

- SOL
- USDC
- JUP
- RAY
- BONK

Non-EVM: wallet and quote flows use Solana addresses and **Jupiter** (not 0x). Separate validation registry from EVM `supportedTokens.ts`.

### Out of scope in Phase 1

- Cross-chain rebalancing
- Bridge quotes or deposits
- Unified “buy basket” that spans multiple chains in one user action

---

## Phase 2 — Multi-chain portfolio tracking

**Goal:** Show a unified portfolio view across chains without executing cross-chain swaps.

| Capability | Description |
|------------|-------------|
| Holdings by chain | ETH mainnet + Base + Avalanche + Solana balances (read-only) |
| Basket attribution | Tag each basket template with `SupportedChain` |
| Valuation | Aggregate USD NAV; per-chain breakdown |
| P&amp;L | Chain-level and total portfolio metrics |
| Quotes | Still **per-chain**; no bridge legs |

Data sources (planned): RPC + indexers, CoinGecko (or chain-native price feeds), optional DeBank / Zerion-style APIs.

Types: `ChainBasketSupport`, `SupportedChain` in `src/types/chain.ts`; backend registry in `backend/src/config/chains.ts`.

---

## Phase 3 — Cross-chain basket execution (bridge aggregators)

**Goal:** Allow a user to fund a basket on chain B while paying on chain A, via bridge + swap composition.

Planned bridge aggregators (evaluation order TBD):

1. **LI.FI** — broad EVM + Solana route coverage
2. **Socket** — Bungee / socket.tech paths
3. **deBridge** — DLN for certain asset corridors

### Execution model (conceptual)

```
User wallet (source chain)
    → Bridge aggregator (LI.FI / Socket / deBridge)
    → Destination chain native asset or stablecoin
    → Per-leg DEX swaps (0x / Jupiter / etc.)
    → Target basket weights
```

| Concern | Approach |
|---------|----------|
| Slippage | Per-leg + bridge fee caps; user-visible warnings |
| Time | Bridge ETA surfaced in review modal |
| Failure | Partial-fill policy; no silent retries |
| Safety | Same execution gates as today; feature flags per mode |

`CrossChainExecutionMode`: `bridge_execution` — see `src/types/chain.ts`.

**Still not live** until backend bridge proxy, token registries per chain, and wallet signing paths are built and audited.

---

## Phase 4 — Full cross-chain portfolio buy/sell

**Goal:** One user intent (“buy Global DeFi basket”) expands to:

1. Optional bridge from user’s primary chain
2. Parallel or sequenced swaps on multiple chains
3. Sell-all that unwinds all legs and optionally consolidates to one exit chain

`CrossChainExecutionMode`: `full_cross_chain`.

Dependencies:

- Phase 2 tracking
- Phase 3 bridge execution reliability
- Multi-chain `BundleExecutor` or coordinated tx batching (optional)
- Agent / keeper support for async bridge completion

---

## Type and config map

| Artifact | Role |
|----------|------|
| `src/types/chain.ts` | Frontend planning types: chains, routers, bridges, execution modes |
| `backend/src/config/chains.ts` | Chain metadata registry (IDs, EVM flag, router, status) |
| `backend/src/config/supportedTokens.ts` | **Ethereum-only** quote allowlist (unchanged behavior) |
| `docs/MULTICHAIN_ARCHITECTURE.md` | This roadmap |

---

## Relationship to current Ethereum 0x routing

The existing quote pipeline is **unchanged**:

- `POST /quotes/buy-basket`, `sell-all`, etc. default to `chainId: 1`
- 0x is only called for `supportedTokens.ts` allowlist entries
- Unsupported tokens return `provider: "unsupported"`

Multi-chain types are **additive** and do not alter API responses until explicitly wired in a future PR.

---

## Open questions (for implementation PRs)

1. **Solana chain ID** in APIs — numeric sentinel vs string key in bridge SDKs
2. **cbBTC / WETH** naming — normalize symbols per chain in token registry
3. **GMX on Avalanche** — confirm router before `isQuoteSupported: true`
4. **Bridge vs swap bundling** — single calldata bundle vs multi-step wallet prompts
5. **Railway env** — separate API keys per chain aggregator

---

## Summary timeline

| Phase | User-facing | Execution |
|-------|-------------|-----------|
| 1 | Single-chain baskets | Same-chain DEX only (Ethereum live; others planned) |
| 2 | Unified portfolio view | Read-only multi-chain |
| 3 | Cross-chain fund a basket | Bridge + DEX |
| 4 | Global buy/sell | Full cross-chain portfolio ops |
