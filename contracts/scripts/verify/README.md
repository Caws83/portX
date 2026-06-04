# Etherscan verification (Sepolia only)

> **Run only after a successful Sepolia deploy.**  
> Requires `ETHERSCAN_API_KEY` in `contracts/.env`.

## Safety

- **Testnet only** (Sepolia, chain id `11155111`)
- **Never commit** API keys or private keys
- Contract is **not audited** — verification does not imply production readiness

---

## Verify Ignition deployment

Replace `portx-sepolia` with your Ignition `--deployment-id` if different:

```bash
npx hardhat ignition verify portx-sepolia --network sepolia
```

---

## Manual verify (alternative)

If you have the deployed address from Ignition output:

```bash
npx hardhat verify --network sepolia <BUNDLE_EXECUTOR_ADDRESS>
```

`BundleExecutor` has no constructor arguments in the v0 draft.

---

## Not included

- No mainnet verification
- No automated verify in CI (add only when deployment process is approved)
