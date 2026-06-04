# PortX Alpha — Release Checklist & Test Plan

> **Single source of truth** for Alpha milestone status.  
> Last updated: 2026-05-29 · Branch: `main`  
> **Scope:** Preview/demo product — no live on-chain execution, no contract deploy in Alpha.

**Legend**

| Symbol | Meaning |
|--------|---------|
| ✅ Complete | Implemented and acceptable for Alpha |
| ⚠ Partial | Scaffolded, env-dependent, or limited coverage |
| ❌ Not Started | Out of scope for current Alpha commit |

---

## 1. Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Railway backend | ⚠ Partial | Fastify API is Railway-ready (`backend/README.md`). Confirm production URL, health, and env vars in Railway dashboard. |
| Netlify frontend | ⚠ Partial | Vite SPA deploys to Netlify (or equivalent). Confirm build command `npm run build`, publish `dist/`, and `VITE_*` env in site settings. |
| Environment variables | ⚠ Partial | Root `.env.example`, `backend/.env.example`, `contracts/.env.example` documented. Production values must be set per host — never commit `.env`. |
| WalletConnect | ⚠ Partial | Requires `VITE_WALLETCONNECT_PROJECT_ID` in frontend env. Connect flow works when ID is valid. |
| 0x API | ⚠ Partial | Backend `ZEROX_API_KEY` enables live 0x quotes; without key, quote engine uses local fallback (`quotes: fallback` on `/health`). |
| CoinGecko | ⚠ Partial | Live pricing when CoinGecko is reachable; `/health` reports `pricing: coingecko` or `pricing: fallback`. |

**Infra smoke test**

```bash
# Backend (local or Railway URL)
curl -s https://<API_HOST>/health | jq .

# Expect: status ok, pricing, quotes, supportedRoutes
```

---

## 2. Frontend Features

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ✅ Complete | Portfolio summary, holdings, active baskets, loading/empty/error states. |
| Portfolio API | ✅ Complete | `usePortfolio` + API with local fallback. |
| Baskets | ✅ Complete | List, select, preview, API + demo fallback. |
| Discover | ✅ Complete | Notable + whale portfolios, chain filter, copy-as-basket. |
| Chain-aware baskets | ✅ Complete | `chain`, `chainLabel`, `chainStatus` on baskets; `BasketChainBadge`. |
| Planned-chain blocking | ✅ Complete | Quotes blocked for Base / Solana / Avalanche planned baskets (`canPreviewQuoteForBasket`). |
| Buy Preview | ✅ Complete | Ethereum (Active) baskets → buy-basket quote preview + review modal. |
| Sell-All Preview | ✅ Complete | Full portfolio unwind preview on Sell All page. |
| Testnet Mode | ⚠ Partial | `VITE_APP_MODE=testnet` scaffold — badge, banner, Sepolia network config; wallet/RPC not switched yet. |
| Wallet Execution Prep | ⚠ Partial | Review modal, readiness checklist, calldata display; `ENABLE_LIVE_EXECUTION` remains false. |
| Dry Run Simulation | ✅ Complete | `simulateExecution()` in review modal — validation only, no RPC send. |

**UI polish (Alpha)**

| Area | Status |
|------|--------|
| Loading / empty / error states | ✅ Complete |
| Consistent button labels & badges | ✅ Complete |
| App mode banner (production / testnet) | ✅ Complete |

---

## 3. Backend Features

| Feature | Status | Notes |
|---------|--------|-------|
| CoinGecko | ✅ Complete | Token prices with static fallback. |
| 0x Quotes | ⚠ Partial | Live when `ZEROX_API_KEY` set; otherwise demo/fallback quotes. |
| Portfolio API | ✅ Complete | Demo portfolio endpoints for Alpha. |
| Basket API | ✅ Complete | Basket list + metadata for frontend. |
| Route Filtering | ✅ Complete | `supportedTokens.ts` — unsupported symbols return `provider: unsupported`. |
| Fallback Engine | ✅ Complete | Local quote/portfolio/basket fallbacks when API or upstream fails. |

**Key routes (verify manually)**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Pricing, quotes mode, route stats |
| GET | `/api/v1/baskets` | Basket catalog |
| GET | `/api/v1/portfolio` | Demo portfolio |
| POST | `/api/v1/quotes/buy-basket` | Buy preview (Ethereum routable legs) |
| POST | `/api/v1/quotes/sell-all` | Sell-all preview |

---

## 4. Contract Features

| Feature | Status | Notes |
|---------|--------|-------|
| BundleExecutor Draft | ✅ Complete | `contracts/src/BundleExecutor.sol` — planning only, not wired to app. |
| Hardhat Tests | ✅ Complete | `contracts/test/BundleExecutor.test.ts` — run locally. |
| Sepolia Scaffold | ⚠ Partial | Hardhat `sepolia` network + Ignition module + deploy/verify READMEs; **not deployed**. |
| Audit Review | ❌ Not Started | Explicitly **NOT audited** per `contracts/README.md`. |
| Testnet Deploy | ❌ Not Started | Commands documented; no production Sepolia address in repo. |
| Mainnet Deploy | ❌ Not Started | Intentionally out of scope for Alpha. |

---

## 5. Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Live execution disabled | ✅ Complete | `ENABLE_LIVE_EXECUTION` default false; `VITE_ENABLE_LIVE_EXECUTION=false` in `.env.example`. |
| Feature flags working | ✅ Complete | `features.ts`, `appMode.ts`, `useFeatureFlags` — testnet mode does not enable execution. |
| No private keys committed | ✅ Complete | Keys only in `.env` (gitignored). Verify with `git log -p` before release. |
| `.env` files ignored | ✅ Complete | Root `.gitignore` ignores `.env`; `contracts/.gitignore` ignores contract `.env`. |
| Contract review pending | ⚠ Partial | Draft + local tests only; formal audit required before any deploy. |

**Pre-release security pass**

- [ ] Confirm `VITE_ENABLE_LIVE_EXECUTION` is not `true` in Netlify production env
- [ ] Confirm Railway secrets are set in dashboard only (not in repo)
- [ ] Confirm `package-lock.json` / `.env` are not in release commits
- [ ] Rotate any key that was ever pasted into chat or CI logs

---

## 6. Testing Checklist

### Frontend (manual)

| Test | Steps | Pass criteria |
|------|-------|---------------|
| Dashboard loads | Open `/dashboard` | Stats render; portfolio loading banner clears or shows fallback warning |
| Baskets load | Open `/baskets` | Basket cards visible; API success or fallback warning |
| Discover loads | Open `/discover` | Notable + whale sections; chain filter works |
| Quotes load | Select Ethereum (Active) basket → **Preview Quote** | Quote card appears; live or fallback badge shown |
| Planned chains blocked | Select Base / Solana / Avalanche planned basket | Preview disabled; planned-chain message shown |

**Production preview banner:** “Live execution disabled. Preview mode only.”

**Testnet scaffold (optional):** set `VITE_APP_MODE=testnet`, rebuild — badge “Testnet Mode” + Sepolia warning banner.

### Backend (manual / curl)

| Test | Command | Pass criteria |
|------|---------|---------------|
| Health endpoint | `GET /health` | `status: "ok"` |
| CoinGecko | `GET /health` | `pricing: "coingecko"` (or `fallback` with warning accepted for Alpha) |
| 0x quotes | `GET /health` | `quotes: "0x"` when key set, else `fallback` documented |
| Route filtering | Buy basket including unsupported symbol | Leg `provider: "unsupported"`; mixed-basket warning if applicable |

Example buy-basket smoke (adjust basket id / amounts to match API):

```bash
curl -s -X POST https://<API_HOST>/api/v1/quotes/buy-basket \
  -H "Content-Type: application/json" \
  -d '{"basketId":"eth-blue-chip","amountUsd":100,"chainId":1,"slippageBps":100}' | jq .
```

### Contracts (local)

| Test | Command | Pass criteria |
|------|---------|---------------|
| Compile | `cd contracts && npm run compile` | No Solidity errors |
| Hardhat tests | `cd contracts && npm test` | All tests pass |

### Build gate (CI / pre-tag)

```bash
npm run build
cd backend && npm run build && cd ..
```

Both must exit `0` before tagging Alpha.

---

## 7. Known Issues

| Issue | Impact | Alpha mitigation |
|-------|--------|------------------|
| **RNDR unsupported** | No 0x route on Ethereum mainnet in v1 | Marked unsupported in `supportedTokens.ts`; UI shows Unsupported badge |
| **FET unsupported** | Placeholder address / not routable | Same |
| **DOGE unsupported** | No valid wrapped mainnet address in demo data | Same |
| **Multi-chain execution not implemented** | Base / Solana / Avalanche baskets are planned-only | Planned-chain blocking; see `docs/MULTICHAIN_ARCHITECTURE.md` |
| **Live execution disabled** | No wallet `sendTransaction` for swaps | By design; demo plan + dry-run only |
| Demo basket ID migration | Old localStorage `activeBasketIds` may reference renamed ids | Clear site data or re-buy baskets if cards missing |
| Large frontend bundle | Vite chunk size warnings | Acceptable for Alpha; optimize in Beta |
| `package-lock.json` local drift | Unrelated lockfile changes on dev machines | Do not commit root lockfile unless dependency bump is intentional |

---

## 8. Beta Roadmap

Ordered next steps after Alpha tag:

1. **Fix token coverage** — RNDR, FET, DOGE (and other gaps) via correct mainnet addresses or explicit “unsupported” product copy
2. **Contract review** — third-party audit on `BundleExecutor` draft
3. **Sepolia deployment** — Ignition deploy per `contracts/scripts/deploy/README.md`
4. **Sepolia basket testing** — wire `VITE_APP_MODE=testnet` to wagmi Sepolia + test API
5. **Feature-flagged execution** — enable `VITE_ENABLE_LIVE_EXECUTION` only on testnet first, then production
6. **Beta release** — Netlify/Railway production envs, monitoring, and user-facing Beta label

---

## Alpha Readiness Summary

| Area | Weight | Score (0–100) |
|------|--------|----------------|
| Frontend (preview UX) | 30% | 92 |
| Backend (API + quotes) | 25% | 85 |
| Infrastructure (deploy ops) | 15% | 70 |
| Contracts (on-chain) | 15% | 40 |
| Security & compliance | 15% | 88 |

**Overall Alpha readiness: ~78 / 100**

Suitable to tag **Alpha** for **preview/demo** use when Railway + Netlify envs are verified and build gate passes. Not suitable for mainnet funds or live swap execution until Beta items 1–5 are complete.

---

## Remaining Blockers (Beta-critical)

1. Formal **contract audit** and **Sepolia deploy** not done  
2. **Token coverage** gaps (RNDR, FET, DOGE)  
3. **Live execution** intentionally off — required for real trading  
4. **Multi-chain** routing and execution not implemented  
5. **Operational verification** of production Railway / Netlify env (manual checklist above)

---

## Related docs

- [MULTICHAIN_ARCHITECTURE.md](./MULTICHAIN_ARCHITECTURE.md) — planned chains, no Alpha execution change  
- [../README.md](../README.md) — install and env setup  
- [../backend/README.md](../backend/README.md) — API routes and Railway  
- [../contracts/README.md](../contracts/README.md) — BundleExecutor planning status  
