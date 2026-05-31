# PortX API (Backend v1)

Demo-first Fastify API for [PortX](https://github.com/Caws83/portX). Powers quote previews, baskets, portfolios, and agent rules with **mock data** — structured for future 0x / 1inch / Uniswap integration.

- No database (v1)
- No private keys
- No real trading
- Railway-ready

## Install

```bash
cd backend
npm install
cp .env.example .env
```

## Run locally

```bash
npm run dev
```

API: **http://localhost:8080**

Production build:

```bash
npm run build
npm start
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port (Railway sets this) |
| `NODE_ENV` | `development` | `production` on Railway |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `ENABLE_DEMO_QUOTES` | `true` | Mock quotes when true |
| `ZEROX_API_KEY` | — | Future 0x Swap API |
| `ONEINCH_API_KEY` | — | Future 1inch API |

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/tokens` | Demo tokens |
| GET | `/baskets` | Demo baskets |
| GET | `/notable-portfolios` | Trending / notable portfolios |
| POST | `/quotes/buy-basket` | Buy basket quote |
| POST | `/quotes/sell-basket` | Sell basket quote |
| POST | `/quotes/sell-all` | Sell full portfolio quote |
| GET | `/portfolio/demo/:walletAddress` | Demo portfolio by wallet |
| GET | `/agents/rules/demo/:walletAddress` | Demo agent rules |

### Example: buy basket quote

```bash
curl -X POST http://localhost:8080/quotes/buy-basket \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x0000000000000000000000000000000000000001",
    "chainId": 1,
    "inputToken": "USDC",
    "inputAmountUsd": 1000,
    "basketId": "top-5-crypto",
    "slippageBps": 100
  }'
```

## Railway deployment

1. Create a new **Railway** project → **Deploy from GitHub** → select `portX` repo.
2. Set **Root Directory** to `backend` (or use a monorepo service pointed at `/backend`).
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`
5. Add environment variables:
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-netlify-app.netlify.app` (your frontend URL)
   - `ENABLE_DEMO_QUOTES=true`
6. Railway assigns `PORT` automatically — do not hardcode.
7. Copy the public URL (e.g. `https://portx-api.up.railway.app`) into frontend `.env`:
   ```
   VITE_PORTX_API_URL=https://your-railway-url.up.railway.app
   VITE_ENABLE_DEMO_QUOTES=false
   ```

## Architecture

```
Routes → Services (quoteEngine, portfolioService)
              → allocationEngine + routeSelector
              → providers (0x, 1inch, Uniswap) [mock v1]
              → data/ (in-memory JSON-style modules)
```

## Future: real data replacement

| Phase | Work |
|-------|------|
| 1 | ✅ Demo API (this release) |
| 2 | Wire `ZEROX_API_KEY` in `zeroXProvider.ts` |
| 3 | Wire `ONEINCH_API_KEY` in `oneInchProvider.ts` |
| 4 | Uniswap SDK / AlphaRouter in `uniswapProvider.ts` |
| 5 | Postgres + wallet intelligence (Arkham, Nansen, DeBank) |
| 6 | On-chain execution validation (no custodial keys on server) |

## License

MIT — demo software, not financial advice.
