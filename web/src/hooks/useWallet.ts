import { useCallback, useEffect, useState } from 'react';
import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
} from '@stellar/freighter-api';
import { horizon, fundWithFriendbot } from '../lib/stellar';
import { walletErrorMessage } from '../lib/errors';

const STORAGE_KEY = 'paylink.walletAddress';

/**
 * L1 wallet hook (Freighter). At L2, swap the connect logic for
 * StellarWalletsKit to satisfy the multi-wallet requirement.
 */
export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async (pk: string) => {
    try {
      const account = await horizon.loadAccount(pk);
      const native = account.balances.find((b) => b.asset_type === 'native');
      setBalance(native ? native.balance : '0');
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // Unfunded account — show 0 and let the user hit Friendbot.
        setBalance('0');
      } else {
        throw e;
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAddress(saved);
  }, []);

  useEffect(() => {
    if (address) refreshBalance(address).catch(() => {});
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { isConnected: installed } = await isConnected();
      if (!installed) throw new Error('FREIGHTER_NOT_INSTALLED');

      const allowed = await isAllowed();
      if (!allowed.isAllowed) await setAllowed();

      const res = await requestAccess();
      if (res.error) throw new Error('ACCESS_REJECTED');

      localStorage.setItem(STORAGE_KEY, res.address);
      setAddress(res.address);
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  /** Disconnect = clear app state. Freighter has no revoke API. */
  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const fund = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      await fundWithFriendbot(address);
      await refreshBalance(address);
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [address, refreshBalance]);

  return {
    address,
    balance,
    loading,
    error,
    connect,
    disconnect,
    fund,
    refreshBalance,
    setError,
  };
}
