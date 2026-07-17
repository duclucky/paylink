import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCVP6RWEZGZEFU74BQOBYO7RYATWL5LX3UAVRLY7R36I3QHZ7VTCFY2G",
  }
} as const

export type Key = {tag: "Req", values: readonly [u32]};


/**
 * On-chain payment request: creator asks for `amount` (stroops); anyone may pay once.
 */
export interface Request {
  amount: i128;
  creator: string;
  paid: boolean;
  payer: Option<string>;
}

export interface Client {
  /**
   * Construct and simulate a get transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read a payment request by id.
   */
  get: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Request>>

  /**
   * Construct and simulate a pay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Mark a request paid by `payer`, then mint a receipt via inter-contract call.
   * 
   * Emits `("paid", payer)` with `id`.
   * 
   * **Value transfer (fallback):** XLM is settled off-contract (classic payment
   * from the frontend). This function records paid status, emits the event, and
   * issues an on-chain receipt via `ReceiptToken.mint`.
   */
  pay: ({id, payer}: {id: u32, payer: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * One-time setup: store the ReceiptToken contract address for inter-contract mints.
   */
  init: ({receipt_id}: {receipt_id: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a payment request. Emits `("created", creator)` with `(id, amount)`.
   */
  create: ({creator, amount}: {creator: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a receipt_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Receipt contract address configured at `init`.
   */
  receipt_id: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAB1SZWFkIGEgcGF5bWVudCByZXF1ZXN0IGJ5IGlkLgAAAAAAAANnZXQAAAAAAQAAAAAAAAACaWQAAAAAAAQAAAABAAAH0AAAAAdSZXF1ZXN0AA==",
        "AAAAAAAAAT1NYXJrIGEgcmVxdWVzdCBwYWlkIGJ5IGBwYXllcmAsIHRoZW4gbWludCBhIHJlY2VpcHQgdmlhIGludGVyLWNvbnRyYWN0IGNhbGwuCgpFbWl0cyBgKCJwYWlkIiwgcGF5ZXIpYCB3aXRoIGBpZGAuCgoqKlZhbHVlIHRyYW5zZmVyIChmYWxsYmFjayk6KiogWExNIGlzIHNldHRsZWQgb2ZmLWNvbnRyYWN0IChjbGFzc2ljIHBheW1lbnQKZnJvbSB0aGUgZnJvbnRlbmQpLiBUaGlzIGZ1bmN0aW9uIHJlY29yZHMgcGFpZCBzdGF0dXMsIGVtaXRzIHRoZSBldmVudCwgYW5kCmlzc3VlcyBhbiBvbi1jaGFpbiByZWNlaXB0IHZpYSBgUmVjZWlwdFRva2VuLm1pbnRgLgAAAAAAAANwYXkAAAAAAgAAAAAAAAACaWQAAAAAAAQAAAAAAAAABXBheWVyAAAAAAAAEwAAAAA=",
        "AAAAAAAAAFFPbmUtdGltZSBzZXR1cDogc3RvcmUgdGhlIFJlY2VpcHRUb2tlbiBjb250cmFjdCBhZGRyZXNzIGZvciBpbnRlci1jb250cmFjdCBtaW50cy4AAAAAAAAEaW5pdAAAAAEAAAAAAAAACnJlY2VpcHRfaWQAAAAAABMAAAAA",
        "AAAAAgAAAAAAAAAAAAAAA0tleQAAAAABAAAAAQAAAAAAAAADUmVxAAAAAAEAAAAE",
        "AAAAAAAAAEtDcmVhdGUgYSBwYXltZW50IHJlcXVlc3QuIEVtaXRzIGAoImNyZWF0ZWQiLCBjcmVhdG9yKWAgd2l0aCBgKGlkLCBhbW91bnQpYC4AAAAABmNyZWF0ZQAAAAAAAgAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAABA==",
        "AAAAAQAAAFNPbi1jaGFpbiBwYXltZW50IHJlcXVlc3Q6IGNyZWF0b3IgYXNrcyBmb3IgYGFtb3VudGAgKHN0cm9vcHMpOyBhbnlvbmUgbWF5IHBheSBvbmNlLgAAAAAAAAAAB1JlcXVlc3QAAAAABAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAABHBhaWQAAAABAAAAAAAAAAVwYXllcgAAAAAAA+gAAAAT",
        "AAAAAAAAAC5SZWNlaXB0IGNvbnRyYWN0IGFkZHJlc3MgY29uZmlndXJlZCBhdCBgaW5pdGAuAAAAAAAKcmVjZWlwdF9pZAAAAAAAAAAAAAEAAAAT" ]),
      options
    )
  }
  public readonly fromJSON = {
    get: this.txFromJSON<Request>,
        pay: this.txFromJSON<null>,
        init: this.txFromJSON<null>,
        create: this.txFromJSON<u32>,
        receipt_id: this.txFromJSON<string>
  }
}