#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Map, Symbol};

const BAL: Symbol = symbol_short!("BAL");

/// Lightweight receipt token: balances only increase via `mint` (issued on pay).
#[contract]
pub struct ReceiptToken;

#[contractimpl]
impl ReceiptToken {
    /// Credit `to` with `amount` receipt units. Returns the new balance.
    pub fn mint(env: Env, to: Address, amount: i128) -> i128 {
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let mut bal: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&BAL)
            .unwrap_or(Map::new(&env));
        let next = bal.get(to.clone()).unwrap_or(0) + amount;
        bal.set(to, next);
        env.storage().instance().set(&BAL, &bal);
        env.storage().instance().extend_ttl(100, 1000);
        next
    }

    /// Current receipt balance for `to`.
    pub fn balance(env: Env, to: Address) -> i128 {
        let bal: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&BAL)
            .unwrap_or(Map::new(&env));
        bal.get(to).unwrap_or(0)
    }
}

mod test;
