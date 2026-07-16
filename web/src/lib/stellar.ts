import { Horizon, rpc, Networks } from '@stellar/stellar-sdk';

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
export const EXPLORER = 'https://stellar.expert/explorer/testnet';

export const horizon = new Horizon.Server(HORIZON_URL);
export const sorobanServer = new rpc.Server(SOROBAN_RPC_URL);
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
export const accountUrl = (pk: string) => `${EXPLORER}/account/${pk}`;
export const contractUrl = (id: string) => `${EXPLORER}/contract/${id}`;

export const friendbotUrl = (pk: string) =>
  `https://friendbot.stellar.org/?addr=${encodeURIComponent(pk)}`;

/** Ask Friendbot to fund a testnet account. Safe to call if already funded. */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(friendbotUrl(publicKey));
  // 400 usually means "account already funded" — not a real error here.
  if (!res.ok && res.status !== 400) {
    throw new Error(`FRIENDBOT_FAILED_${res.status}`);
  }
}
