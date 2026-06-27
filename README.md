# PortX official.

**Trade portfolios like a single asset.**

PortX is a DeFi portfolio trading platform that lets users buy, manage, and sell crypto portfolios as one position instead of swapping tokens one by one.

> One click in. One click out.

## Project overview

PortX composes **crypto baskets** (weighted token portfolios), lets you **enter in a single transaction flow**, track unified **P&L**, and **exit** the full book — or individual baskets — with portfolio-level **take-profit** and **stop-loss** targets.

This repository includes the **MVP frontend** (Vite/React) and **Backend v1** (`/backend` — Fastify API for Railway). Wallet connect, baskets, demo quotes, Discover, and agent placeholders. **No real on-chain trading** yet.

## Features

- Wallet connect (RainbowKit + wagmi + viem)
- Portfolio dashboard with P&L and holdings
- Five demo baskets + custom basket builder
- Buy basket in one demo transaction flow
- Sell full basket or entire portfolio
- Take-profit (e.g. sell all at 2x) and stop-loss (e.g. -20%) targets
- AI Agent section (placeholders)
- DEX quote engine with 0x / 1inch / Uniswap route selection (demo mode)
- Buy / sell / sell-all quote previews with transaction review modal
- **Discover** — trending addresses & notable portfolios (demo copy-as-basket)

## Trending Portfolios

Browse **Trending Addresses**, **Notable Portfolios**, and **Whale Watch** on the Discover page (`/discover`).

- Currently **mock/demo data** only — not verified wallet ownership
- **Copy as Basket** saves a portfolio template to your Zustand basket store
- **No trade is executed** until you preview a quote on Baskets and sign from your wallet
- Future plan: connect wallet intelligence APIs (Arkham, Nansen, DeBank) and company treasury data

## Backend v1 (`/backend`)

Fastify TypeScript API with mock quotes, baskets, portfolios, and agent rules. Railway-ready.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default: **http://localhost:8080** · See [backend/README.md](./backend/README.md) for routes and Railway deploy.

Point the frontend at the API:

```
VITE_PORTX_API_URL=http://localhost:8080
```

## Tech stack

| Layer | Tools |
|-------|--------|
| Frontend | Vite, React, TypeScript, Tailwind |
| Backend | Node.js, Fastify, Zod |
| Web3 | wagmi, viem, RainbowKit |
| State | Zustand (persisted) |

## Install

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Add your [WalletConnect Cloud](https://cloud.walletconnect.com) project ID:

```
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
VITE_PORTX_API_URL=http://localhost:8080
VITE_ENABLE_DEMO_QUOTES=true
```

## Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Vercel frontend deploy

Deploy the repo root as a Vercel project (backend stays on Railway — see [backend/README.md](./backend/README.md)).

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |

Required environment variables:

```
VITE_APP_MODE=production
VITE_ENABLE_LIVE_EXECUTION=false
VITE_PORTX_API_URL=https://<railway-service>.up.railway.app
VITE_WALLETCONNECT_PROJECT_ID=<real id>
```

SPA routing for `/baskets`, `/settings`, `/dashboard`, etc. is handled by [`vercel.json`](./vercel.json).

## Project structure

```
backend/          # Fastify API (Railway)
src/
├── api/          # Backend API client (quotes, portfolio)
├── config/       # chains, wagmi, constants
├── components/   # UI building blocks
├── pages/        # route pages
├── store/        # Zustand portfolio & basket state
├── services/     # quote engine, route selector, providers
├── hooks/        # portfolio, basket, quote preview
├── data/         # demo tokens & baskets
└── types/        # TypeScript models
```

Integration comments mark where **smart contracts**, **DEX aggregators**, and **AI agents** will connect.

## Multi-chain architecture (planned)

Single-chain Ethereum quotes are live today; other chains are documented for future phases only. See **[docs/MULTICHAIN_ARCHITECTURE.md](./docs/MULTICHAIN_ARCHITECTURE.md)** for Phase 1–4 baskets (Ethereum, Base, Avalanche, Solana), bridge aggregators, and type/config references (`src/types/chain.ts`, `backend/src/config/chains.ts`).

## DEX Routing Architecture

PortX is **non-custodial**. The platform never holds user funds or private keys. Baskets are **execution strategies** at the MVP stage — not vault tokens. Users sign every swap from their connected wallet.

```
Frontend (React)
    ↓
PortX Backend API (VITE_PORTX_API_URL)
    ↓
Quote Engine → 0x / 1inch / Uniswap providers
    ↓
Route Selector (best output per leg)
    ↓
Transaction Builder → Review Modal
    ↓
User wallet signs (wagmi / viem) — coming soon
```

| Layer | Location | Role |
|-------|----------|------|
| API client | `src/api/` | Calls PortX backend; keeps DEX API keys server-side |
| Allocation engine | `src/services/allocationEngine.ts` | Splits basket $ into per-token legs |
| Quote engine | `src/services/quoteEngine.ts` | Orchestrates buy/sell/sell-all previews |
| Providers | `src/services/providers/` | 0x (primary), 1inch (secondary), Uniswap (fallback) |
| Route selector | `src/services/routeSelector.ts` | Compares quotes, picks best route per leg |
| Transaction builder | `src/services/transactionBuilder.ts` | Builds execution plan + calldata placeholders |

**Router priority:** 0x first → 1inch comparison → Uniswap direct fallback. **BundleExecutor** smart contract comes later (Phase 5).

## Roadmap

### Phase 1 — Demo quote engine ✅
Local mocked providers, allocation engine, quote preview UI, transaction review modal.

### Phase 2 — Backend quote API
PortX API at `VITE_PORTX_API_URL` validates quotes server-side; frontend never exposes aggregator keys.

### Phase 3 — Live 0x integration
Real quotes and calldata via backend proxy to 0x Swap API.

### Phase 4 — 1inch + Uniswap comparison
Multi-provider routing with gas-adjusted best-route scoring.

### Phase 5 — BundleExecutor smart contract
Optional single-tx basket entry/exit via on-chain executor (still non-custodial).

### Phase 6 — AI / scripting agent automation
Auto exit, rebalance, profit lock via keepers and agent runners.

## Future roadmap (extended)

- [ ] PortX basket smart contracts (mint/redeem)
- [ ] Live 0x / 1inch / Uniswap quote aggregation
- [ ] On-chain portfolio valuation oracles
- [ ] Take-profit / stop-loss keepers (Gelato, Chainlink Automation)
- [ ] AI trading agents (rebalance, risk-off, profit lock)
- [ ] Multi-chain deployment
- [ ] Transaction history & analytics

## GitHub setup

Push this project to [https://github.com/Caws83/portX.git](https://github.com/Caws83/portX.git):

```bash
git init
git remote add origin https://github.com/Caws83/portX.git
git add .
git commit -m "Initial PortX MVP"
git branch -M main
git push -u origin main
```

## License

MIT — demo software, not financial advice.
