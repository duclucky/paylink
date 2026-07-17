import { Client as PayRequestClient, networks as payNetworks } from '../contracts/payrequest/src';
import { Client as ReceiptClient, networks as receiptNetworks } from '../contracts/receipt/src';
import type { Request } from '../contracts/payrequest/src';
import { NETWORK_PASSPHRASE, SOROBAN_RPC_URL, txUrl } from './stellar';
import { signWithKit } from './walletKit';

export const PAYREQUEST_ID = payNetworks.testnet.contractId;
export const RECEIPT_ID = receiptNetworks.testnet.contractId;

export type { Request };

function payClient(publicKey?: string) {
  return new PayRequestClient({
    contractId: PAYREQUEST_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: SOROBAN_RPC_URL,
    publicKey,
  });
}

function receiptClient(publicKey?: string) {
  return new ReceiptClient({
    contractId: RECEIPT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: SOROBAN_RPC_URL,
    publicKey,
  });
}

async function signAndSend(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: { signAndSend: (opts: any) => Promise<any> },
  address: string,
): Promise<{ hash: string; url: string; result: unknown }> {
  const sent = await tx.signAndSend({
    signTransaction: async (xdr: string) => {
      const signedTxXdr = await signWithKit(xdr, address);
      // SDK's SignTransaction expects an object, not a bare string.
      return { signedTxXdr, signerAddress: address };
    },
  });

  const hash =
    sent.sendTransactionResponse?.hash ??
    sent.getTransactionResponse?.txHash ??
    sent.hash ??
    '';
  return { hash, url: hash ? txUrl(hash) : '', result: sent.result };
}

/** Read-only: load a payment request. */
export async function getRequest(id: number): Promise<Request> {
  const tx = await payClient().get({ id });
  return tx.result as Request;
}

/** Create a payment request (amount in stroops). */
export async function createRequest(
  creator: string,
  amountStroops: bigint,
): Promise<{ id: number; hash: string; url: string }> {
  const client = payClient(creator);
  const assembled = await client.create({
    creator,
    amount: amountStroops,
  });
  const { hash, url, result } = await signAndSend(assembled, creator);
  return { id: Number(result), hash, url };
}

/** Mark request paid + mint receipt (after classic XLM settlement). */
export async function payRequest(
  id: number,
  payer: string,
): Promise<{ hash: string; url: string }> {
  const client = payClient(payer);
  const assembled = await client.pay({ id, payer });
  const { hash, url } = await signAndSend(assembled, payer);
  return { hash, url };
}

/** Receipt token balance for an address (stroops units). */
export async function getReceiptBalance(to: string): Promise<bigint> {
  const tx = await receiptClient().balance({ to });
  return BigInt(tx.result as bigint | number | string);
}
