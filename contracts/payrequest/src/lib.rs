#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

/// PayLink payment-request contract (skeleton — filled in subsequent commits).
#[contract]
pub struct PayRequest;

#[contractimpl]
impl PayRequest {
    /// Build/smoke marker so the crate compiles before features land.
    pub fn version(_env: Env) -> u32 {
        1
    }
}

mod test;
