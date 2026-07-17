# PayLink

**PayLink** is a payment-request dApp on the Stellar **Testnet**: a creator makes a
request for a specific XLM amount; anyone can open the link and pay it; the request
tracks paid/unpaid status live; paying issues an on-chain receipt via **inter-contract
communication** (`PayRequest` → `ReceiptToken.mint`).

Built for Rise In **Stellar Journey to Mastery** — **Level 3 / Orange Belt** (includes
wallet + payment shell from L1).

| Layer | Status |
|-------|--------|
| L1 shell (Freighter, balance, send XLM) | ✅ |
| Contracts (`payrequest` + `receipt`, inter-contract mint) | ✅ Verified on testnet |
| Frontend (multi-wallet, create/pay, events) | ⏳ Next |
| CI + Vercel + demo video | ⏳ Later |

## Live demo

`<PLACEHOLDER: paste Vercel URL after deploy>`

## Architecture

```
┌─────────────┐  create / pay / get   ┌──────────────┐
│  Frontend   │ ───────────────────►  │  PayRequest  │
│  (React)    │                       │  (Soroban)   │
└─────────────┘                       └──────┬───────┘
                                             │ on pay(): receipt.mint(payer, amount)
                                             ▼
                                      ┌──────────────┐
                                      │ ReceiptToken │
                                      │ mint/balance │
                                      └──────────────┘
```

**Value transfer (in use):** **Fallback** — XLM is settled with a classic Stellar
payment from the frontend (or separately); `pay` marks the request paid, emits
`paid`, and **mints a receipt** via inter-contract call. Native SAC settlement is
not used in this version (keeps auth/demo simple on testnet).

## Deployed contracts (testnet — real)

| Contract | Address |
|----------|---------|
| **ReceiptToken** | [`CC5ULTHI54XPDNBM2M2CELK57SAAHW6AISJOYIJXB3PM4KBVRQDRVI2P`](https://stellar.expert/explorer/testnet/contract/CC5ULTHI54XPDNBM2M2CELK57SAAHW6AISJOYIJXB3PM4KBVRQDRVI2P) |
| **PayRequest** | [`CCVP6RWEZGZEFU74BQOBYO7RYATWL5LX3UAVRLY7R36I3QHZ7VTCFY2G`](https://stellar.expert/explorer/testnet/contract/CCVP6RWEZGZEFU74BQOBYO7RYATWL5LX3UAVRLY7R36I3QHZ7VTCFY2G) |

| Evidence | Value |
|----------|--------|
| **Cross-call `pay` tx** (emits `paid`, mints receipt) | [`c162a1eea1b6a3d700a2f3397e1a609cb355dd1c7b08db4761d5241425686264`](https://stellar.expert/explorer/testnet/tx/c162a1eea1b6a3d700a2f3397e1a609cb355dd1c7b08db4761d5241425686264) |
| **Create request tx** | [`e672cc70721db26050cbfd8f8a8bd174c68ade2eac3572fec3e6cfa6f3fec7ee`](https://stellar.expert/explorer/testnet/tx/e672cc70721db26050cbfd8f8a8bd174c68ade2eac3572fec3e6cfa6f3fec7ee) |
| Receipt balance after `pay` | `0` → **`100`** (proves inter-contract mint) |

Network: **Testnet** · Horizon: `https://horizon-testnet.stellar.org` ·
Soroban RPC: `https://soroban-testnet.stellar.org` ·
Explorer: https://stellar.expert/explorer/testnet

## Contract API

### `PayRequest`

| Function | Description |
|----------|-------------|
| `init(receipt_id)` | Store ReceiptToken address (once) |
| `create(creator, amount) -> u32` | New request; event `created` |
| `pay(id, payer)` | Mark paid + **`receipt.mint(payer, amount)`**; event `paid` |
| `get(id) -> Request` | Read request |
| `receipt_id() -> Address` | Configured receipt contract |

### `ReceiptToken`

| Function | Description |
|----------|-------------|
| `mint(to, amount) -> i128` | Credit receipt units; returns new balance |
| `balance(to) -> i128` | Read balance |

Amounts are **stroops** (`i128` / JS `bigint`). 1 XLM = 10_000_000 stroops.

## Deploy workflow (testnet)

**Build order:** always build `receipt` before `payrequest` (caller imports
`receipt.wasm`).

```bash
# Identity (once)
stellar keys generate deployer --network testnet --fund
stellar keys address deployer

# Build callee first, then caller
cd contracts/receipt && stellar contract build
cd ../payrequest     && stellar contract build

# Deploy
stellar contract deploy \
  --wasm contracts/receipt/target/wasm32v1-none/release/receipt.wasm \
  --source deployer --network testnet
# → RECEIPT_ID

stellar contract deploy \
  --wasm contracts/payrequest/target/wasm32v1-none/release/payrequest.wasm \
  --source deployer --network testnet
# → PAYREQUEST_ID

# Wire inter-contract
stellar contract invoke --id $PAYREQUEST_ID --source deployer --network testnet \
  -- init --receipt_id $RECEIPT_ID

# Smoke: create → pay → read receipt balance
DEPLOYER=$(stellar keys address deployer)
stellar contract invoke --id $PAYREQUEST_ID --source deployer --network testnet \
  -- create --creator $DEPLOYER --amount 100
# → request id (e.g. 1)

stellar contract invoke --id $RECEIPT_ID --source deployer --network testnet \
  -- balance --to $DEPLOYER
# → 0

stellar contract invoke --id $PAYREQUEST_ID --source deployer --network testnet \
  -- pay --id 1 --payer $DEPLOYER
# → emits paid; mints receipt

stellar contract invoke --id $RECEIPT_ID --source deployer --network testnet \
  -- balance --to $DEPLOYER
# → 100  (cross-call verified)

# TS bindings (for frontend, next phase)
stellar contract bindings typescript --network testnet \
  --id $PAYREQUEST_ID --output-dir web/src/contracts/payrequest
stellar contract bindings typescript --network testnet \
  --id $RECEIPT_ID --output-dir web/src/contracts/receipt
```

**Wasm path note:** CLI v27 outputs to `target/wasm32v1-none/release/` (not
`wasm32-unknown-unknown`). Target: `rustup target add wasm32v1-none`.

**Cargo.lock:** committed for both crates. If `cargo test` fails with
`ChaCha20Rng: CryptoRng`, run:
`cargo update -p ed25519-dalek@3.0.0 --precise 2.2.0`.

## Run frontend (L1 shell — until L3 UI lands)

```bash
cd web
npm install
npm run dev   # http://localhost:5173
npm test
npm run build
```

Prerequisites: Node 20+, [Freighter](https://www.freighter.app/) on **Testnet**.

## Tests (contracts)

```bash
cd contracts/receipt && cargo test --locked
cd ../payrequest     && cargo test --locked
```

Current counts: **receipt ≥3**, **payrequest ≥5** (including
`receipt_balance_increases_after_pay` for the inter-contract path).

## Features (current)

- Connect / disconnect Freighter; XLM balance; send XLM + tx hash (L1 shell)
- `PayRequest` + `ReceiptToken` on testnet
- Inter-contract mint on `pay` (**verified**: receipt balance increased)
- Events: `created`, `paid`
- `extend_ttl` on instance/persistent writes
- Contract unit tests with locked deps

## Screenshots / L3 submission evidence

| Item | Status |
|------|--------|
| Contract address | ✅ above |
| Contract-interaction tx hash | ✅ `pay` tx above |
| Mobile UI | `<PLACEHOLDER: after frontend>` |
| CI green | `<PLACEHOLDER: after CI + push>` |
| Test output 3+ passing | Run `cargo test --locked` in both crates |
| Live demo (Vercel) | `<PLACEHOLDER: paste after deploy>` |
| Demo video 1–2 min | `<PLACEHOLDER: paste YouTube/Loom link>` |

### Frontend screenshots (fill when UI is done)

`<PLACEHOLDER: mobile UI / create-pay flow / receipt balance>`

## Project structure

```
paylink/
├── web/                      # React + Vite + TS (L1 shell; L3 UI next)
├── contracts/
│   ├── receipt/              # ReceiptToken (mint, balance)
│   └── payrequest/           # PayRequest → imports receipt.wasm
├── docs/screenshots/
└── README.md
```

## Human-only steps

- Approve Freighter signatures for the app
- Push / create GitHub (repo already exists)
- Vercel deploy authorization
- Demo video recording + Rise In submit
- Never commit secret keys

## License

MIT — Stellar testnet only. Never commit secret keys or seed phrases.
