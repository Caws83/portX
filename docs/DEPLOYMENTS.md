# PortX — Contract Deployments

> **Scope:** On-chain deployment registry for PortX contracts.  
> **Alpha v0.1:** Sepolia testnet only — not production.

---

## 1. Sepolia Deployments

### BundleExecutor

| Field | Value |
|-------|--------|
| **Network** | Sepolia (`chainId: 11155111`) |
| **Address** | `0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B` |
| **Verified** | Yes |
| **Explorer** | https://sepolia.etherscan.io/address/0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B#code |
| **Deployment tx** | `0xd51002352cafc5f6b19dcfef20e9e43e7394dedbce7dfe0af065c4b7e9f0cc82` |
| **Deployer** | `0xad772981ede52c0365265d7e24e2f426210d809b` |
| **Ignition deployment ID** | `portx-sepolia` |
| **Source** | `contracts/src/BundleExecutor.sol` |
| **Compiler** | Solidity `0.8.20` (optimizer enabled, 200 runs) |
| **Constructor args** | None |

Deployed via Hardhat Ignition:

```bash
npx hardhat ignition deploy ignition/modules/BundleExecutor.ts --network sepolia --deployment-id portx-sepolia
```

Verified via Hardhat:

```bash
npx hardhat verify --network sepolia 0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B
```

---

## 2. Contract Status

| Status | BundleExecutor (Sepolia) |
|--------|--------------------------|
| Deployed | Yes |
| Verified on Etherscan | Yes |
| Audited | **No** — planning draft only |
| Wired into frontend | **No** |
| Wired into backend | **No** |
| Live execution enabled | **No** (`VITE_ENABLE_LIVE_EXECUTION=false`) |

PortX Alpha continues to use quote preview and dry-run simulation only. The Sepolia contract is **not** called by the app.

---

## 3. Future Integration

When explicitly approved (post-audit, feature-flagged testnet path):

### Frontend (placeholder)

```env
VITE_BUNDLE_EXECUTOR_SEPOLIA=0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B
```

Or a shared name:

```env
BUNDLE_EXECUTOR_ADDRESS=0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B
```

### Backend (placeholder)

```env
BUNDLE_EXECUTOR_ADDRESS=0xbfa84769F94A896DB43f308fe6E4543ACeDcF49B
BUNDLE_EXECUTOR_CHAIN_ID=11155111
```

**Not configured in Alpha v0.1.** Do not enable live execution without audit and product sign-off.

---

## 4. Notes

- **Sepolia only** — no mainnet deployment in this milestone.
- **Not production** — testnet experimentation and verification only.
- **Mainnet deployment requires** a professional audit, updated `BundleExecutor` review, and explicit enablement of execution features.
- **Do not commit** deployer private keys or `contracts/.env`.
- See also: [SEPOLIA_DEPLOY_CHECKLIST.md](./SEPOLIA_DEPLOY_CHECKLIST.md), [SEPOLIA_VERIFICATION_PLAN.md](./SEPOLIA_VERIFICATION_PLAN.md), [contracts/README.md](../contracts/README.md).

---

## Mainnet

| Contract | Status |
|----------|--------|
| BundleExecutor | Not deployed — intentionally out of scope |
