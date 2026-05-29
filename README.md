# PortX

**Trade portfolios like a single asset.**

PortX is a DeFi portfolio trading platform that lets users buy, manage, and sell crypto portfolios as one position instead of swapping tokens one by one.

> One click in. One click out.

## Project overview

PortX composes **crypto baskets** (weighted token portfolios), lets you **enter in a single transaction flow**, track unified **P&L**, and **exit** the full book — or individual baskets — with portfolio-level **take-profit** and **stop-loss** targets.

This repository is the **MVP frontend**: wallet connect, dashboard, basket creation, demo buy/sell flows, exit targets, AI agent placeholders, and DEX routing stubs. **No real on-chain trading** is implemented yet.

## Features

- Wallet connect (RainbowKit + wagmi + viem)
- Portfolio dashboard with P&L and holdings
- Five demo baskets + custom basket builder
- Buy basket in one demo transaction flow
- Sell full basket or entire portfolio
- Take-profit (e.g. sell all at 2x) and stop-loss (e.g. -20%) targets
- AI Agent section (placeholders)
- DEX router service stubs (0x / 1inch / Uniswap)

## Tech stack

| Layer | Tools |
|-------|--------|
| Build | Vite |
| UI | React, TypeScript, Tailwind CSS |
| Web3 | wagmi, viem, RainbowKit |
| State | Zustand (persisted) |
| Routing | React Router |

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

## Project structure

```
src/
├── config/       # chains, wagmi, constants
├── components/   # UI building blocks
├── pages/        # route pages
├── store/        # Zustand portfolio & basket state
├── services/     # DEX, pricing, agents (stubs)
├── hooks/        # portfolio, basket, swap quotes
├── data/         # demo tokens & baskets
└── types/        # TypeScript models
```

Integration comments mark where **smart contracts**, **DEX aggregators**, and **AI agents** will connect.

## Future roadmap

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
