# PayLink

**PayLink** is a payment-request dApp on the Stellar **Testnet**: a creator makes a
request for a specific XLM amount; anyone can open the link and pay it; the request
tracks paid/unpaid status live; paying issues an on-chain receipt.

This repo grows across the Rise In **Stellar Journey to Mastery** belts:

| Belt | Status | What it adds |
|------|--------|--------------|
| **L1 White** | ✅ In this branch | Freighter connect/disconnect, XLM balance, send XLM + tx hash |
| **L2 Yellow** | Planned | `PayRequest` contract, multi-wallet, create/pay/events |
| **L3 Orange** | Planned | `ReceiptToken` inter-contract mint, tests, CI, Vercel, demo video |

## Live demo

_Optional at L1. At L3: paste Vercel URL after deploy._

`<PLACEHOLDER: paste Vercel URL after deploy>`

## Features (Level 1)

- Connect / disconnect **Freighter** on Stellar Testnet
- Fetch and display the connected account’s **XLM balance** (Horizon)
- **Send XLM** to any address with amount validation
- Visible **transaction status** (pending → success/fail) and **tx hash** with explorer link
- **Fund via Friendbot** for unfunded testnet accounts
- Friendly error handling (wallet missing, user rejected, insufficient balance, unfunded account)
- Mobile-responsive layout (Tailwind)

## Tech stack

- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind CSS v4
- **Wallet (L1):** `@stellar/freighter-api`
- **Stellar JS:** `@stellar/stellar-sdk` (Horizon + Soroban RPC clients ready for L2+)
- **Network:** Stellar Testnet only

## Run locally

### Prerequisites

1. [Node.js 20+](https://nodejs.org/)
2. [Freighter](https://www.freighter.app/) browser extension
3. In Freighter: **Preferences → Network → Testnet**

### Dev server

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Tests & production build

```bash
cd web
npm test
npm run build
```

## How to use (L1 checklist)

1. Open the app → **Connect Freighter** → approve access in the extension.
2. If balance is `0`, click **Fund (Friendbot)** (or open
   `https://friendbot.stellar.org/?addr=<YOUR_G_ADDRESS>`).
3. Enter a destination public key (`G…`, 56 chars) and an amount → **Send payment**.
4. Approve the signature in Freighter.
5. Confirm the green success card shows the **tx hash** and explorer link.

### Screenshots to capture for submission

Save under `docs/screenshots/` and embed below:

| # | Shot | File |
|---|------|------|
| 1 | Wallet connected | `docs/screenshots/01-wallet-connected.png` |
| 2 | Balance shown | `docs/screenshots/02-balance.png` |
| 3 | Successful testnet tx (explorer or app) | `docs/screenshots/03-successful-tx.png` |
| 4 | Tx result in the UI (hash + link) | `docs/screenshots/04-tx-result-ui.png` |

## Screenshots

<!-- Paste after you take them (L1 submission evidence) -->

### 1. Wallet connected

`<PLACEHOLDER: paste screenshot after connect>`

### 2. Balance shown

`<PLACEHOLDER: paste screenshot of balance card>`

### 3. Successful testnet transaction

`<PLACEHOLDER: paste screenshot / explorer view of a real payment>`

### 4. Transaction result shown to the user

`<PLACEHOLDER: paste screenshot of the green success card with hash + explorer link>`

## Stellar details

- **Network:** Testnet (`Test SDF Network ; September 2015`)
- **Horizon:** https://horizon-testnet.stellar.org
- **Soroban RPC:** https://soroban-testnet.stellar.org
- **Explorer:** https://stellar.expert/explorer/testnet
- **Example payment tx hash:**  
  `<PLACEHOLDER: paste after a successful send — e.g. from the app success card>`  
  Explorer: `https://stellar.expert/explorer/testnet/tx/<HASH>`
- **Deployed contract address (L2+):** `<PLACEHOLDER: paste after deploy>`
- **Contract-call tx hash (L2+):** `<PLACEHOLDER: paste after invoke>`

## Value-transfer design (planned)

- **Recommended (L2+):** settle inside `pay` via the native Stellar Asset Contract
  (SAC) on testnet.
- **Fallback:** frontend classic XLM payment, then contract `pay` to mark paid +
  emit event.

_Will be stated as used once L2 is implemented._

## Roadmap

### L2 — Yellow Belt

- Multi-wallet via `@creit.tech/stellar-wallets-kit`
- Soroban `PayRequest`: `create` / `pay` / `get` + `paid` event
- Create / share / pay a request from the UI
- ≥3 error types, visible tx status, ≥2 commits

### L3 — Orange Belt

- `ReceiptToken` + inter-contract `mint` on payment
- `RequestFactory` listing, contract + frontend tests (≥3), GitHub Actions CI
- Mobile polish, Vercel live demo, 1–2 min demo video, ≥10 commits

## Project structure

```
paylink/
├── web/                 # React + Vite + TS frontend
│   ├── src/
│   │   ├── lib/         # stellar config, payments, errors
│   │   ├── hooks/       # useWallet
│   │   └── App.tsx
│   └── package.json
├── docs/screenshots/    # submission evidence
└── README.md
```

_L2 adds `contracts/payrequest/`; L3 adds `contracts/receipt/` and `.github/workflows/ci.yml`._

## License

MIT — built for learning on Stellar testnet. Never commit secret keys.
