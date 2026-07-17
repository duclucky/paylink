import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK_PASSPHRASE } from './stellar';

/** Shared kit instance — multi-wallet picker (Freighter, xBull, Albedo, Lobstr, …). */
export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

export async function pickWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (opt) => {
        try {
          kit.setWallet(opt.id);
          const { address } = await kit.getAddress();
          if (!address) throw new Error('FREIGHTER_NOT_INSTALLED');
          resolve(address);
        } catch (e) {
          reject(e);
        }
      },
      onClosed: () => reject(new Error('WALLET_PICK_CANCELLED')),
    });
  });
}

export async function signWithKit(xdr: string, address: string): Promise<string> {
  try {
    const { signedTxXdr } = await kit.signTransaction(xdr, {
      address,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    if (!signedTxXdr) throw new Error('SIGN_REJECTED');
    return signedTxXdr;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/reject|denied|cancel|user/i.test(msg)) throw new Error('SIGN_REJECTED');
    throw e;
  }
}
