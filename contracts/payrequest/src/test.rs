#![cfg(test)]
use super::*;
use soroban_sdk::Env;

#[test]
fn version_is_one() {
    let env = Env::default();
    let id = env.register(PayRequest, ());
    let client = PayRequestClient::new(&env, &id);
    assert_eq!(client.version(), 1);
}
