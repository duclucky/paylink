/**
 * Map thrown wallet/tx errors to friendly messages.
 * Covers L1 needs and the three L2-required types (wallet not found,
 * user rejected, insufficient balance) plus common Horizon failures.
 */
export function walletErrorMessage(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e);
  switch (code) {
    case 'FREIGHTER_NOT_INSTALLED':
      return 'No Stellar wallet found. Install the Freighter extension first.';
    case 'WALLET_PICK_CANCELLED':
      return 'Wallet selection was cancelled.';
    case 'ACCESS_REJECTED':
    case 'SIGN_REJECTED':
      return 'You rejected the request in your wallet.';
    default:
      if (/op_underfunded|tx_insufficient|underfunded|insufficient/i.test(code))
        return 'Insufficient balance for this transaction.';
      if (/404|not\s*found/i.test(code))
        return 'Account not found on testnet — fund it via Friendbot first.';
      if (/friendbot_failed/i.test(code))
        return 'Friendbot could not fund the account. Try again in a moment.';
      return 'Something went wrong. Please try again.';
  }
}
