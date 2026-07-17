import { TransactionBuilder, Operation, Asset, BASE_FEE } from '@stellar/stellar-sdk';
import { horizon, NETWORK_PASSPHRASE, txUrl } from './stellar';
import { signWithKit } from './walletKit';

/**
 * Build, sign (via StellarWalletsKit), and submit a native XLM payment on testnet.
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

  const signedXdr = await signWithKit(tx.toXDR(), from);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const res = await horizon.submitTransaction(signedTx);
  return { hash: res.hash, url: txUrl(res.hash) };
}
