#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, PayRequestClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Register ReceiptToken from the imported wasm (same bytes as the deployed contract).
    let receipt_addr = env.register(receipt::WASM, ());
    let pay_id = env.register(PayRequest, ());
    let client = PayRequestClient::new(&env, &pay_id);
    client.init(&receipt_addr);

    let creator = Address::generate(&env);
    let payer = Address::generate(&env);
    (env, client, creator, payer)
}

#[test]
fn create_then_get() {
    let (env, client, creator, _) = setup();
    let _ = env;
    let rid = client.create(&creator, &100);
    let req = client.get(&rid);
    assert_eq!(req.amount, 100);
    assert_eq!(req.paid, false);
    assert_eq!(req.creator, creator);
    assert_eq!(req.payer, None);
}

#[test]
fn create_increments_ids() {
    let (env, client, creator, _) = setup();
    let _ = env;
    let a = client.create(&creator, &10);
    let b = client.create(&creator, &20);
    assert_eq!(a, 1);
    assert_eq!(b, 2);
    assert_eq!(client.get(&b).amount, 20);
}

#[test]
fn pay_marks_paid_and_sets_payer() {
    let (env, client, creator, payer) = setup();
    let _ = env;
    let rid = client.create(&creator, &50);
    client.pay(&rid, &payer);
    let req = client.get(&rid);
    assert_eq!(req.paid, true);
    assert_eq!(req.payer, Some(payer));
}

#[test]
#[should_panic(expected = "already paid")]
fn pay_twice_panics() {
    let (env, client, creator, payer) = setup();
    let _ = env;
    let rid = client.create(&creator, &50);
    client.pay(&rid, &payer);
    client.pay(&rid, &payer);
}

/// Proves the inter-contract path: after `pay`, receipt balance of the payer increases.
#[test]
fn receipt_balance_increases_after_pay() {
    let env = Env::default();
    env.mock_all_auths();

    let receipt_addr = env.register(receipt::WASM, ());
    let pay_id = env.register(PayRequest, ());
    let pay = PayRequestClient::new(&env, &pay_id);
    pay.init(&receipt_addr);

    let receipt = receipt::Client::new(&env, &receipt_addr);
    let creator = Address::generate(&env);
    let payer = Address::generate(&env);

    assert_eq!(receipt.balance(&payer), 0);

    let rid = pay.create(&creator, &100);
    pay.pay(&rid, &payer);

    assert_eq!(receipt.balance(&payer), 100);
    assert_eq!(pay.get(&rid).paid, true);
}
