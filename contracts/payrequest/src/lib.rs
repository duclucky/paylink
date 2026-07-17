#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

/// Typed client for the ReceiptToken contract (build `receipt` wasm first).
mod receipt {
    soroban_sdk::contractimport!(
        file = "../receipt/target/wasm32v1-none/release/receipt.wasm"
    );
}

/// On-chain payment request: creator asks for `amount` (stroops); anyone may pay once.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Request {
    pub creator: Address,
    pub amount: i128,
    pub paid: bool,
    pub payer: Option<Address>,
}

const COUNT: Symbol = symbol_short!("COUNT");
const RECEIPT: Symbol = symbol_short!("RECEIPT");

#[contracttype]
pub enum Key {
    Req(u32),
}

#[contract]
pub struct PayRequest;

#[contractimpl]
impl PayRequest {
    /// One-time setup: store the ReceiptToken contract address for inter-contract mints.
    pub fn init(env: Env, receipt_id: Address) {
        if env.storage().instance().has(&RECEIPT) {
            panic!("already initialized");
        }
        env.storage().instance().set(&RECEIPT, &receipt_id);
        env.storage().instance().extend_ttl(100, 1000);
    }

    /// Create a payment request. Emits `("created", creator)` with `(id, amount)`.
    pub fn create(env: Env, creator: Address, amount: i128) -> u32 {
        creator.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let id: u32 = env.storage().instance().get(&COUNT).unwrap_or(0) + 1;
        env.storage().instance().set(&COUNT, &id);
        env.storage().instance().extend_ttl(100, 1000);

        let req = Request {
            creator: creator.clone(),
            amount,
            paid: false,
            payer: None,
        };
        env.storage().persistent().set(&Key::Req(id), &req);
        env.storage().persistent().extend_ttl(&Key::Req(id), 100, 1000);

        env.events()
            .publish((symbol_short!("created"), creator), (id, amount));
        id
    }

    /// Mark a request paid by `payer`, then mint a receipt via inter-contract call.
    ///
    /// Emits `("paid", payer)` with `id`.
    ///
    /// **Value transfer (fallback):** XLM is settled off-contract (classic payment
    /// from the frontend). This function records paid status, emits the event, and
    /// issues an on-chain receipt via `ReceiptToken.mint`.
    pub fn pay(env: Env, id: u32, payer: Address) {
        payer.require_auth();
        let mut req: Request = env
            .storage()
            .persistent()
            .get(&Key::Req(id))
            .expect("no request");
        if req.paid {
            panic!("already paid");
        }

        let amount = req.amount;
        req.paid = true;
        req.payer = Some(payer.clone());
        env.storage().persistent().set(&Key::Req(id), &req);
        env.storage().persistent().extend_ttl(&Key::Req(id), 100, 1000);

        // Inter-contract: issue receipt units equal to the request amount.
        let receipt_id: Address = env
            .storage()
            .instance()
            .get(&RECEIPT)
            .expect("not initialized");
        let client = receipt::Client::new(&env, &receipt_id);
        client.mint(&payer, &amount);

        env.events().publish((symbol_short!("paid"), payer), id);
    }

    /// Read a payment request by id.
    pub fn get(env: Env, id: u32) -> Request {
        env.storage()
            .persistent()
            .get(&Key::Req(id))
            .expect("no request")
    }

    /// Receipt contract address configured at `init`.
    pub fn receipt_id(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&RECEIPT)
            .expect("not initialized")
    }
}

mod test;
