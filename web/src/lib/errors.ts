/**
 * Map thrown wallet/tx errors to friendly messages.
 * Covers L1 needs and the three L2-required types (wallet not found,
 * user rejected, insufficient balance) plus common Horizon failures.
 */
export function walletErrorMessage(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e);
  // Nested error objects from Horizon / SDK
  const nested =
    typeof e === 'object' && e !== null
      ? JSON.stringify(e)
      : '';
  const blob = `${code} ${nested}`;

  switch (code) {
    case 'FREIGHTER_NOT_INSTALLED':
      return 'No Stellar wallet found. Install the Freighter extension first.';
    case 'WALLET_PICK_CANCELLED':
      return 'Wallet selection was cancelled.';
    case 'ACCESS_REJECTED':
    case 'SIGN_REJECTED':
      return 'You rejected the request in your wallet.';
    case 'INVALID_AMOUNT':
      return 'Enter a valid XLM amount greater than 0.';
    default:
      if (/reject|denied|user.?cancel/i.test(blob) && /sign|auth|access/i.test(blob))
        return 'You rejected the request in your wallet.';
      if (/op_underfunded|tx_insufficient|underfunded|insufficient/i.test(blob))
        return 'Insufficient balance for this transaction.';
      if (/already paid/i.test(blob))
        return 'This request is already paid.';
      if (/no request/i.test(blob))
        return 'Payment request not found.';
      if (/404|not\s*found/i.test(blob))
        return 'Account not found on testnet — fund it via Friendbot first.';
      if (/friendbot_failed/i.test(blob))
        return 'Friendbot could not fund the account. Try again in a moment.';
      return 'Something went wrong. Please try again.';
  }
}
