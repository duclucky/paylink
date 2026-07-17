import { useCallback, useEffect, useState } from 'react';
import { horizon, fundWithFriendbot } from '../lib/stellar';
import { walletErrorMessage } from '../lib/errors';
import { pickWallet, kit } from '../lib/walletKit';
import { FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';

const STORAGE_KEY = 'paylink.walletAddress';
const WALLET_ID_KEY = 'paylink.walletId';

/**
 * Multi-wallet hook via StellarWalletsKit (Freighter, xBull, Albedo, Lobstr, …).
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
        setBalance('0');
      } else {
        throw e;
      }
    }
  }, []);

  // Restore previous session.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const walletId = localStorage.getItem(WALLET_ID_KEY) || FREIGHTER_ID;
    if (saved) {
      try {
        kit.setWallet(walletId);
      } catch {
        /* kit may not know wallet yet */
      }
      setAddress(saved);
    }
  }, []);

  useEffect(() => {
    if (address) refreshBalance(address).catch(() => {});
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const addr = await pickWallet();
      localStorage.setItem(STORAGE_KEY, addr);
      // kit selected wallet id is internal; keep Freighter as default restore id
      localStorage.setItem(WALLET_ID_KEY, FREIGHTER_ID);
      setAddress(addr);
    } catch (e) {
      setError(walletErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WALLET_ID_KEY);
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
