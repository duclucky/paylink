import { TransactionBuilder, Operation, Asset, BASE_FEE } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { horizon, NETWORK_PASSPHRASE, txUrl } from './stellar';

/**
 * Build, sign (via Freighter), and submit a native XLM payment on testnet.
 * Returns the transaction hash and an explorer URL — show these to the user
 * (the L1 "transaction result" requirement).
 */
export async function sendXlm(
  from: string,
  to: string,
  amount: string,
): Promise<{ hash: string; url: string }> {
  const source = await horizon.loadAccount(from);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.payment({ destination: to, asset: Asset.native(), amount }))
    .setTimeout(180)
    .build();

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: from,
  });
  if (signed.error) throw new Error('SIGN_REJECTED');

  const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
  const res = await horizon.submitTransaction(signedTx);
  return { hash: res.hash, url: txUrl(res.hash) };
}
