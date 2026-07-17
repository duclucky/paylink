#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn balance_starts_at_zero() {
    let env = Env::default();
    let id = env.register(ReceiptToken, ());
    let client = ReceiptTokenClient::new(&env, &id);
    let user = Address::generate(&env);
    assert_eq!(client.balance(&user), 0);
}

#[test]
fn mint_accumulates() {
    let env = Env::default();
    let id = env.register(ReceiptToken, ());
    let client = ReceiptTokenClient::new(&env, &id);
    let user = Address::generate(&env);

    assert_eq!(client.mint(&user, &100), 100);
    assert_eq!(client.mint(&user, &50), 150);
    assert_eq!(client.balance(&user), 150);
}

#[test]
fn mint_is_per_address() {
    let env = Env::default();
    let id = env.register(ReceiptToken, ());
    let client = ReceiptTokenClient::new(&env, &id);
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    client.mint(&a, &10);
    client.mint(&b, &20);
    assert_eq!(client.balance(&a), 10);
    assert_eq!(client.balance(&b), 20);
}
