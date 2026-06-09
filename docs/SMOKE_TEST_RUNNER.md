# PortX Alpha v0.1 — Manual Smoke Test Runner

> **For:** You (manual tester) · **Scope:** Alpha preview — no live swap execution  
> **Companion:** [PRODUCTION_SMOKE_TEST.md](./PRODUCTION_SMOKE_TEST.md) (production pass/fail gate)  
> **Last updated:** 2026-05-29

Work through each section in order. Mark **PASS**, **FAIL**, or **SKIP** in the final table.

---

## 1. Start local dev

Use **two terminals** from the repo root.

### Terminal A — Backend

```powershell
cd backend
cp .env.example .env
# Edit .env: set ZEROX_API_KEY if you want live 0x quotes locally
npm install
npm run dev
```

**Expected**

| Check | Expected |
|-------|----------|
| URL | `http://localhost:8080` |
| Health | `curl http://localhost:8080/health` → `"status": "ok"` |
| Log | `PortX API listening on http://0.0.0.0:8080` |

### Terminal B — Frontend

```powershell
# From repo root
cp .env.example .env
# Edit .env: VITE_WALLETCONNECT_PROJECT_ID, VITE_PORTX_API_URL=http://localhost:8080
npm install
npm run dev
```

**Expected**

| Check | Expected |
|-------|----------|
| URL | `http://localhost:5173` (Vite default) |
| Banner | **Production Preview** + “Live execution disabled. Preview mode only.” |
| API | Network tab shows requests to `localhost:8080`, not production Railway (unless you pointed `.env` there) |

---

## 2. Check live backend (Railway)

Open or curl production health:

**URL:** https://portx-production.up.railway.app/health

```powershell
curl -s https://portx-production.up.railway.app/health
```

**Expected (production with keys configured)**

```json
{
  "status": "ok",
  "pricing": "coingecko",
  "quotes": "0x",
  "supportedRoutes": { ... }
}
```

| Field | Expected | If wrong |
|-------|----------|----------|
| `status` | `"ok"` | Check Railway service is running |
| `pricing` | `"coingecko"` | CoinGecko down or rate-limited → may show `fallback` |
| `quotes` | `"0x"` | `ZEROX_API_KEY` missing on Railway → `fallback` |

**Optional CORS check** (browser console on Netlify site):

```javascript
fetch('https://portx-production.up.railway.app/health').then(r => r.json()).then(console.log)
```

No CORS error if `CORS_ORIGIN` includes `https://portxs.netlify.app`.

---

## 3. Check live frontend (Netlify)

**URL:** https://portxs.netlify.app

| Check | Expected |
|-------|----------|
| Site loads | No blank page / build error |
| Hard refresh on `/baskets` | Page loads (no 404) |
| Mode badge | **Production Preview** |
| API calls | Network → `portx-production.up.railway.app` (not `localhost`) |

---

## 4. Test pages (in order)

Test **local** (`localhost:5173`) and/or **production** (`portxs.netlify.app`). Record which environment you used.

| # | Page | Path | What to verify |
|---|------|------|----------------|
| 1 | **Home** | `/` | Hero loads, nav links work, **Launch App** goes to dashboard |
| 2 | **Dashboard** | `/dashboard` | Portfolio stats, holdings or empty state, loading banner clears |
| 3 | **Baskets** | `/baskets` | Basket cards load, chain badges visible, quote panel on right (desktop) |
| 4 | **Discover** | `/discover` | Notable + Whale sections, chain filter buttons |
| 5 | **Sell All** | `/sell-all` | Portfolio value, preview button, demo warning |
| 6 | **Settings** | `/settings` | Wallet status, App mode panel, slippage prefs |

For each page: no console errors that block the UI; API offline shows warning banner + retry where implemented.

---

## 5. Baskets test

Go to **Baskets** (`/baskets`).

### 5a. Ethereum basket — preview quote works

1. Select **DeFi Blue Chips** or **Stable Yield Basket** (Ethereum · **Active**).
2. Click **Preview Quote**.
3. Wait for quote card.

| Check | Expected |
|-------|----------|
| Quote card | Appears with legs, slippage, totals |
| Badge | **Live Quote** or **Fallback Quote** (if API/0x offline) |
| Button | **Review & Execute** enabled (for routable basket) |

### 5b. Planned baskets — blocked

1. Select **Base AI Basket**, **Solana Meme Basket**, or **Avalanche DeFi Basket** (badge **Planned**).
2. Try **Preview Quote**.

| Check | Expected |
|-------|----------|
| Preview button | Disabled or label **Quotes unavailable (planned chain)** |
| Message | Planned-chain warning visible on card or sidebar |
| No API quote call | No buy-basket request for planned chain (check Network tab) |

### 5c. Unsupported tokens — clean warning

1. Select **Top 5 Crypto** (Ethereum Active but includes **SOL** in weights) **or** preview a basket with **DOGE** / **FET** / **RNDR** if present in demo data.
2. Run **Preview Quote** if enabled.

| Check | Expected |
|-------|----------|
| Unsupported legs | **Unsupported** badge on route provider |
| Review | **Review & Execute** blocked or clear warning for unsupported legs |
| No crash | UI stays usable; error/warning in banner or card |

### 5d. No real transaction

1. On a successful Ethereum preview, click **Review & Execute**.
2. In the review modal, click **Simulate Transaction** (optional).
3. Click confirm / demo execute if shown.

| Check | Expected |
|-------|----------|
| Wallet popup | **No** `eth_sendTransaction` for a real swap |
| Outcome | Demo plan message or execution blocked; live execution disabled |

---

## 6. Sell All test

Go to **Sell All** (`/sell-all`).

### 6a. Preview works

1. Ensure demo portfolio has holdings (buy a basket in demo flow if empty).
2. Click **Preview Sell All**.

| Check | Expected |
|-------|----------|
| Quote card | Sell-all preview with legs |
| Loading | Loading banner while fetching |

### 6b. Dry run simulation

1. Click **Review & Demo Sell** on the preview card.
2. In modal, click **Simulate Transaction**.

| Check | Expected |
|-------|----------|
| Simulation | Label updates (passed / failed) |
| Wallet | No on-chain send |

### 6c. Live execution disabled

| Check | Expected |
|-------|----------|
| App banner | “Live execution disabled. Preview mode only.” |
| Settings | Live execution: **Disabled** |
| Confirm | Demo sell only — no real swap |

---

## 7. Wallet test

Use MetaMask or RainbowKit test wallet.

| # | Test | Steps | Expected |
|---|------|-------|----------|
| W1 | Connect | Click Connect → approve | Address shown in header / Settings |
| W2 | Disconnect | Disconnect wallet | Disconnected state |
| W3 | Wrong network | Connect on Polygon / Base / Sepolia | Review modal shows network mismatch; no silent send |
| W4 | No real swap popup | Complete basket review through simulate/demo | **Never** approve a real swap tx in Alpha |

---

## 8. Contract test (local)

From repo root:

```powershell
cd contracts
npm install
npm run build
npx hardhat test
```

**Expected output**

```
  15 passing
```

Tests cover `BundleExecutor`: ownership, rescue, reentrancy, `executeBasket` success/failure paths.

**Not required for Alpha smoke:** `contracts/.env` — only needed for Sepolia deploy (see `contracts/scripts/deploy/README.md`).

---

## 9. Env check

Verify local files exist and are **not committed** (`.gitignore` covers `.env`).

### Frontend — root `.env`

| Variable | Local dev | Production (Netlify) |
|----------|-----------|----------------------|
| `VITE_APP_MODE` | `production` | `production` |
| `VITE_ENABLE_LIVE_EXECUTION` | `false` | `false` |
| `VITE_WALLETCONNECT_PROJECT_ID` | Your WC project ID | Same |
| `VITE_PORTX_API_URL` | `http://localhost:8080` | `https://portx-production.up.railway.app` |
| `VITE_ENABLE_DEMO_QUOTES` | `true` (local OK) | `false` (prefer API) |

### Backend — `backend/.env`

| Variable | Notes |
|----------|-------|
| `PORT` | `8080` |
| `CORS_ORIGIN` | `http://localhost:5173` locally; include `https://portxs.netlify.app` on Railway |
| `ZEROX_API_KEY` | Set on Railway for `quotes: "0x"` |
| `ENABLE_DEMO_QUOTES` | `true` local; `false` on Railway for production-like smoke |

### Contracts — `contracts/.env`

| When | Needed |
|------|--------|
| Alpha smoke (compile + test) | **Not needed** |
| Sepolia deploy only | Copy `contracts/.env.example` → `.env` (RPC, deployer key, Etherscan) |

---

## 10. Final pass/fail table

**Tester:** _______________ · **Date:** _______________ · **Commit:** _______________  
**Environment tested:** ☐ Local ☐ Production ☐ Both

| ID | Section | Test | PASS | FAIL | SKIP | Notes |
|----|---------|------|:----:|:----:|:----:|-------|
| 1 | Local dev | Backend starts :8080 | | | | |
| 2 | Local dev | Frontend starts :5173 | | | | |
| 3 | Live backend | `/health` status ok | | | | |
| 4 | Live backend | `pricing = coingecko` | | | | |
| 5 | Live backend | `quotes = 0x` | | | | |
| 6 | Live frontend | portxs.netlify.app loads | | | | |
| 7 | Pages | Home | | | | |
| 8 | Pages | Dashboard | | | | |
| 9 | Pages | Baskets | | | | |
| 10 | Pages | Discover | | | | |
| 11 | Pages | Sell All | | | | |
| 12 | Pages | Settings | | | | |
| 13 | Baskets | ETH Active preview quote | | | | |
| 14 | Baskets | Planned chains blocked | | | | |
| 15 | Baskets | Unsupported token warning | | | | |
| 16 | Baskets | No real transaction | | | | |
| 17 | Sell All | Preview loads | | | | |
| 18 | Sell All | Dry run simulation | | | | |
| 19 | Sell All | Live execution disabled | | | | |
| 20 | Wallet | Connect / disconnect | | | | |
| 21 | Wallet | Wrong network handling | | | | |
| 22 | Wallet | No real swap popup | | | | |
| 23 | Contracts | `hardhat test` — 15 passing | | | | |
| 24 | Env | Frontend `.env` correct | | | | |
| 25 | Env | Backend `.env` / Railway secrets | | | | |

### Result

| Outcome | Criteria |
|---------|----------|
| **ALPHA SMOKE PASS** | All rows PASS (or SKIP only for optional prod-only rows when testing local only) |
| **BLOCKED** | Any **FAIL** on rows 13–16, 19, 22, or 23 |

---

## Quick reference

| Resource | URL |
|----------|-----|
| Live API health | https://portx-production.up.railway.app/health |
| Live frontend | https://portxs.netlify.app |
| Local frontend | http://localhost:5173 |
| Local API | http://localhost:8080 |

## Related docs

- [ALPHA_RELEASE_CHECKLIST.md](./ALPHA_RELEASE_CHECKLIST.md)
- [PRODUCTION_SMOKE_TEST.md](./PRODUCTION_SMOKE_TEST.md)
