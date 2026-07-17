#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

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

#[contracttype]
pub enum Key {
    Req(u32),
}

#[contract]
pub struct PayRequest;

#[contractimpl]
impl PayRequest {
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

    /// Mark a request paid by `payer`. Emits `("paid", payer)` with `id`.
    ///
    /// Value transfer: **fallback** path — the frontend (or caller) settles XLM
    /// via a classic payment first; this function records paid status + event.
    /// L3 adds an inter-contract receipt mint on top of this.
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

        req.paid = true;
        req.payer = Some(payer.clone());
        env.storage().persistent().set(&Key::Req(id), &req);
        env.storage().persistent().extend_ttl(&Key::Req(id), 100, 1000);

        env.events().publish((symbol_short!("paid"), payer), id);
    }

    /// Read a payment request by id.
    pub fn get(env: Env, id: u32) -> Request {
        env.storage()
            .persistent()
            .get(&Key::Req(id))
            .expect("no request")
    }
}

mod test;
