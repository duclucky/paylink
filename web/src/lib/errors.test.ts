import { describe, it, expect } from 'vitest';
import { walletErrorMessage } from './errors';

describe('walletErrorMessage', () => {
  it('handles a missing wallet', () => {
    expect(walletErrorMessage(new Error('FREIGHTER_NOT_INSTALLED'))).toMatch(/install/i);
  });

  it('handles a user rejection', () => {
    expect(walletErrorMessage(new Error('SIGN_REJECTED'))).toMatch(/rejected/i);
  });

  it('handles an underfunded account', () => {
    expect(walletErrorMessage(new Error('op_underfunded'))).toMatch(/insufficient/i);
  });

  it('falls back for unknown errors', () => {
    expect(walletErrorMessage(new Error('some_weird_code'))).toMatch(/went wrong/i);
  });
});
