# Sepolia Multi-Token Beta — Browser E2E Checklist

Manual verification for the full **buy → hold → sell** loop on Sepolia testnet.

## Prerequisites

- Branch: `testnet`
- Frontend env: `VITE_APP_MODE=testnet`, `VITE_ENABLE_LIVE_EXECUTION=true`
- Wallet connected on **Sepolia (11155111)** with test ETH for gas
- BundleExecutor: `0x62cf7897E37155404658f885743BAfE4CDd58890`

## Flow

### 1. Buy Sepolia Multi-Token Beta

1. Open **Crypto Baskets**
2. Select **Sepolia Multi-Token Beta**
3. **Preview Quote** → **Review & Execute**
4. Confirm gates pass → **Execute Sepolia Test Swap**
5. Sign transaction (`msg.value` > 0 for ETH legs + WETH wrap)

**Verify**

- [ ] Tx confirms on Sepolia Etherscan
- [ ] Wallet receives **LINK**, **UNI**, **WETH**, **AAVE** (non-zero balances)
- [ ] BundleExecutor stranded balances = **0** for all four tokens

### 2. Preview Sell

1. **Preview Sell Quote** appears when wallet holds any basket token (not only demo “owned” state)
2. Preview shows token amounts sold and estimated **USDC** received
3. **Review & Execute** opens sell modal

**Verify**

- [ ] Quote source: testnet (no API/fallback)
- [ ] Four legs: LINK/UNI/WETH/AAVE → USDC
- [ ] `msg.value = 0` in payload preview

### 3. Approve tokens

For each of **LINK**, **UNI**, **WETH**, **AAVE**:

1. Click **Approve {TOKEN}** (spender = BundleExecutor)
2. Sign approval tx
3. Allowance shows **Sufficient**

**Verify**

- [ ] All four approvals complete before Execute enables
- [ ] Static simulation passes after approvals

### 4. Execute sell

1. **Execute Sepolia Basket Sell**
2. Confirm dialog → sign `executeBasket` with `value: 0`

**Verify**

- [ ] Tx confirms on Sepolia Etherscan
- [ ] **USDC** balance increases
- [ ] **LINK**, **UNI**, **WETH**, **AAVE** decrease (sold amounts)
- [ ] BundleExecutor stranded: USDC 0, LINK 0, UNI 0, WETH 0, AAVE 0

### 5. UI / portfolio

- [ ] **Recent Test Swaps** shows sell with per-leg routes (e.g. `LINK → USDC · UNI → USDC …`)
- [ ] **Testnet Portfolio** shows Sell direction, sold assets, USDC received, tx link
- [ ] Wallet asset table refreshes after sell

## Script alternative (no browser)

```bash
cd contracts
npm run testnet:multi-token-basket   # buy
npm run testnet:multi-token-sell     # sell
```

Record tx hashes and balance deltas from script output.

## Known limits

- Sells **full wallet balance** per basket token (no partial sell)
- Testnet only — mainnet sell remains disabled
- Local portfolio/history is browser storage, not on-chain indexing
