# PortX Alpha v0.1 — Production Smoke Test

> **Purpose:** Repeatable manual smoke test for **production** (Railway + Netlify) before tagging Alpha or advancing to Sepolia / Beta.  
> **Last updated:** 2026-05-29 · **Scope:** Preview only — no live swap execution.

**Status values**

| Status | Meaning |
|--------|---------|
| **PASS** | Verified in production (or staging mirror) on test date |
| **FAIL** | Broken or unsafe — block release |
| **NOT TESTED** | Not run yet |

**Prerequisites**

- Production Railway API URL: `https://<RAILWAY_HOST>`
- Production Netlify site URL: `https://<NETLIFY_HOST>`
- Tester wallet (test funds only if on wrong network)
- Browser devtools Network tab for CORS / API checks
- Record tester name, date, and build/commit in the Pass/Fail table

**Build gate (local, before or after smoke test)**

```bash
npm run build
cd backend && npm run build && cd ..
```

Both must exit `0`.

---

## 1. Railway

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| R1 | `/health` endpoint | `curl -s https://<RAILWAY_HOST>/health` | HTTP 200, JSON `status: "ok"` | NOT TESTED |
| R2 | `pricing = coingecko` | Inspect `/health` response | `pricing: "coingecko"` (not `fallback`) | NOT TESTED |
| R3 | `quotes = 0x` | Inspect `/health` response | `quotes: "0x"` when `ZEROX_API_KEY` set on Railway | NOT TESTED |
| R4 | CORS working | From Netlify site, open Network → any API call | No CORS error; `Access-Control-Allow-Origin` includes Netlify origin | NOT TESTED |
| R5 | API reachable | Dashboard or Baskets loads data from API | Success banner or live data (not permanent offline fallback) | NOT TESTED |

**Railway env checklist (dashboard only — do not commit)**

- [ ] `ZEROX_API_KEY` set
- [ ] `CORS_ORIGIN` includes Netlify URL (comma-separated if multiple)
- [ ] `ENABLE_DEMO_QUOTES=false` for production smoke (optional but recommended)

**Example health check**

```bash
curl -s https://<RAILWAY_HOST>/health | jq '{status, pricing, quotes, supportedRoutes}'
```

**CORS spot check (browser console on Netlify site)**

```javascript
fetch('https://<RAILWAY_HOST>/health').then(r => r.json()).then(console.log)
```

---

## 2. Netlify

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| N1 | Site loads | Open `https://<NETLIFY_HOST>/` | Home or redirect loads without blank screen | NOT TESTED |
| N2 | Routing works | Navigate to `/dashboard`, `/baskets`, `/discover`, `/sell-all` | Each route renders correct page | NOT TESTED |
| N3 | Refresh works | On `/baskets`, hard refresh (F5) | Page loads (SPA fallback / `_redirects` — no 404) | NOT TESTED |
| N4 | Environment variables loaded | Settings or Network → API base URL | Requests go to Railway URL, not `localhost:8080` | NOT TESTED |

**Netlify env checklist**

- [ ] `VITE_PORTX_API_URL=https://<RAILWAY_HOST>`
- [ ] `VITE_WALLETCONNECT_PROJECT_ID` set
- [ ] `VITE_APP_MODE=production`
- [ ] `VITE_ENABLE_LIVE_EXECUTION=false`
- [ ] `VITE_ENABLE_DEMO_QUOTES=false` (prefer API in production)

---

## 3. Wallet

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| W1 | Connect wallet | Click Connect → approve in wallet | Connected state; address shown | NOT TESTED |
| W2 | Disconnect wallet | Disconnect from wallet UI | Disconnected state | NOT TESTED |
| W3 | Wrong network handling | Connect on non–Ethereum-mainnet chain | Review modal / readiness shows network mismatch guidance (no silent send) | NOT TESTED |
| W4 | Testnet mode badge | **Production:** badge reads **Production Preview** | Blue badge in navbar; info banner: live execution disabled | NOT TESTED |
| W4b | Testnet mode badge (optional) | Separate build with `VITE_APP_MODE=testnet` | **Testnet Mode** badge + Sepolia warning banner | NOT TESTED |

---

## 4. Dashboard

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| D1 | Portfolio loads | Open `/dashboard` | Holdings / stats render after loading banner clears | NOT TESTED |
| D2 | Fallback works | Temporarily block API (or wrong URL in dev) | Warning banner: API unavailable — offline data | NOT TESTED |
| D3 | Retry works | Click **Retry API** on fallback banner | Re-fetches portfolio; success or clear error | NOT TESTED |

---

## 5. Baskets

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| B1 | Ethereum basket quote preview | Select **Ethereum (Active)** basket → **Preview Quote** | Quote preview card appears | NOT TESTED |
| B2 | Planned chains blocked | Select Base / Solana / Avalanche **Planned** basket | Preview disabled; planned-chain message | NOT TESTED |
| B3 | Unsupported routes handled | Basket with RNDR / FET / DOGE (if in demo set) | **Unsupported** badge on leg; review blocked or warned | NOT TESTED |
| B4 | Buy preview loads | Complete B1 → **Review & Execute** | Review modal opens; no wallet transaction sent | NOT TESTED |

---

## 6. Discover

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| DC1 | Chain filters | Toggle All / Ethereum / Base / Solana / Avalanche | List counts update; filtered cards match chain | NOT TESTED |
| DC2 | Whale portfolios | Scroll to Whale Watch | Cards render or empty state for filter | NOT TESTED |
| DC3 | Empty state | Filter chain with no matches | Empty state title + description shown | NOT TESTED |

---

## 7. Sell All

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| S1 | Preview loads | `/sell-all` → **Preview Sell All** (with holdings) | Sell-all quote card appears | NOT TESTED |
| S2 | Fallback works | API offline scenario | Warning banner + local fallback quote (if implemented) | NOT TESTED |
| S3 | Unsupported route handling | Holdings include unsupported token | Unsupported provider badge; no live execution path | NOT TESTED |

---

## 8. Security

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| SEC1 | `ENABLE_LIVE_EXECUTION=false` | Netlify env + Settings → Live execution | Shows **Disabled**; env not `true` | NOT TESTED |
| SEC2 | No transaction can be sent | Review modal → confirm / execute | Demo plan only or blocked — **no** `eth_sendTransaction` in wallet | NOT TESTED |
| SEC3 | Dry run only | App mode banner on production | “Live execution disabled. Preview mode only.” | NOT TESTED |
| SEC4 | Simulation works | Review modal → **Simulate Transaction** | Simulation passed/failed label updates; still no on-chain send | NOT TESTED |

**Critical:** Any unexpected wallet transaction prompt = **FAIL** — stop test and investigate.

---

## 9. Contracts

| # | Test | Steps | Expected | Status |
|---|------|-------|----------|--------|
| C1 | Hardhat tests pass | `cd contracts && npm test` | All tests green (run locally / CI) | NOT TESTED |
| C2 | Sepolia scaffold present | Verify `contracts/hardhat.config.ts` sepolia network, Ignition module, deploy README | Files exist; no requirement to deploy for Alpha smoke | NOT TESTED |
| C3 | No deployment executed | Check repo / chain for BundleExecutor address | No production Sepolia/mainnet deploy claimed in Alpha v0.1 | NOT TESTED |

---

## 10. Pass / Fail Table

Fill after running smoke test. **Critical** rows must be **PASS** for Alpha Release Gate.

| ID | Area | Test | Critical | Status | Tester | Date | Notes |
|----|------|------|----------|--------|--------|------|-------|
| R1 | Railway | Health 200 | Yes | NOT TESTED | | | |
| R2 | Railway | pricing = coingecko | Yes | NOT TESTED | | | |
| R3 | Railway | quotes = 0x | Yes | NOT TESTED | | | |
| R4 | Railway | CORS | Yes | NOT TESTED | | | |
| R5 | Railway | API reachable from UI | Yes | NOT TESTED | | | |
| N1 | Netlify | Site loads | Yes | NOT TESTED | | | |
| N2 | Netlify | Client routing | Yes | NOT TESTED | | | |
| N3 | Netlify | Hard refresh | Yes | NOT TESTED | | | |
| N4 | Netlify | Env vars | Yes | NOT TESTED | | | |
| W1 | Wallet | Connect | No | NOT TESTED | | | |
| W2 | Wallet | Disconnect | No | NOT TESTED | | | |
| W3 | Wallet | Wrong network | Yes | NOT TESTED | | | |
| W4 | Wallet | Production badge | No | NOT TESTED | | | |
| D1 | Dashboard | Portfolio loads | Yes | NOT TESTED | | | |
| D2 | Dashboard | Fallback | No | NOT TESTED | | | |
| D3 | Dashboard | Retry | No | NOT TESTED | | | |
| B1 | Baskets | ETH quote preview | Yes | NOT TESTED | | | |
| B2 | Baskets | Planned blocked | Yes | NOT TESTED | | | |
| B3 | Baskets | Unsupported routes | Yes | NOT TESTED | | | |
| B4 | Baskets | Buy preview modal | Yes | NOT TESTED | | | |
| DC1 | Discover | Chain filters | No | NOT TESTED | | | |
| DC2 | Discover | Whale section | No | NOT TESTED | | | |
| DC3 | Discover | Empty state | No | NOT TESTED | | | |
| S1 | Sell All | Preview loads | Yes | NOT TESTED | | | |
| S2 | Sell All | Fallback | No | NOT TESTED | | | |
| S3 | Sell All | Unsupported handling | Yes | NOT TESTED | | | |
| SEC1 | Security | Live execution off | Yes | NOT TESTED | | | |
| SEC2 | Security | No tx sent | Yes | NOT TESTED | | | |
| SEC3 | Security | Dry run banner | Yes | NOT TESTED | | | |
| SEC4 | Security | Simulation | Yes | NOT TESTED | | | |
| C1 | Contracts | Hardhat tests | Yes | NOT TESTED | | | |
| C2 | Contracts | Sepolia scaffold | No | NOT TESTED | | | |
| C3 | Contracts | No deploy | Yes | NOT TESTED | | | |

**Summary counts (fill in after test run)**

| Result | Count |
|--------|-------|
| PASS | 0 |
| FAIL | 0 |
| NOT TESTED | 34 |

---

## Alpha Release Gate

**All critical tests (marked Yes above) must be PASS** before:

1. **Sepolia deployment** — `BundleExecutor` Ignition deploy to testnet  
2. **Beta release** — public Beta label, feature-flagged execution, or mainnet-facing marketing  

### Critical test IDs (must PASS)

`R1` `R2` `R3` `R4` `R5` · `N1` `N2` `N3` `N4` · `W3` · `D1` · `B1` `B2` `B3` `B4` · `S1` `S3` · `SEC1` `SEC2` `SEC3` `SEC4` · `C1` `C3`

### Gate decision

| Condition | Decision |
|-----------|----------|
| All critical = PASS, zero FAIL | **Alpha v0.1 production smoke — APPROVED** |
| Any critical = FAIL | **BLOCKED** — fix before Sepolia or Beta |
| Critical = NOT TESTED | **INCOMPLETE** — finish smoke test before gate sign-off |

### Sign-off (optional)

| Role | Name | Date | Gate |
|------|------|------|------|
| Tester | | | |
| Owner | | | |

---

## Related docs

- [ALPHA_RELEASE_CHECKLIST.md](./ALPHA_RELEASE_CHECKLIST.md) — feature status and Beta roadmap  
- [MULTICHAIN_ARCHITECTURE.md](./MULTICHAIN_ARCHITECTURE.md) — planned chains  
- [../backend/README.md](../backend/README.md) — Railway deploy and CORS  
- [../contracts/README.md](../contracts/README.md) — contract planning status  
