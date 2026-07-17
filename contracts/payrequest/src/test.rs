#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn create_then_get() {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(PayRequest, ());
    let client = PayRequestClient::new(&env, &id);
    let creator = Address::generate(&env);

    let rid = client.create(&creator, &100);
    let req = client.get(&rid);
    assert_eq!(req.amount, 100);
    assert_eq!(req.paid, false);
    assert_eq!(req.creator, creator);
    assert_eq!(req.payer, None);
}

#[test]
fn create_increments_ids() {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(PayRequest, ());
    let client = PayRequestClient::new(&env, &id);
    let creator = Address::generate(&env);

    let a = client.create(&creator, &10);
    let b = client.create(&creator, &20);
    assert_eq!(a, 1);
    assert_eq!(b, 2);
    assert_eq!(client.get(&b).amount, 20);
}

#[test]
fn pay_marks_paid_and_sets_payer() {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(PayRequest, ());
    let client = PayRequestClient::new(&env, &id);
    let creator = Address::generate(&env);
    let payer = Address::generate(&env);

    let rid = client.create(&creator, &50);
    client.pay(&rid, &payer);
    let req = client.get(&rid);
    assert_eq!(req.paid, true);
    assert_eq!(req.payer, Some(payer));
}

#[test]
#[should_panic(expected = "already paid")]
fn pay_twice_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(PayRequest, ());
    let client = PayRequestClient::new(&env, &id);
    let creator = Address::generate(&env);
    let payer = Address::generate(&env);

    let rid = client.create(&creator, &50);
    client.pay(&rid, &payer);
    client.pay(&rid, &payer);
}
