import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { sendXlm } from './lib/payments';
import { walletErrorMessage } from './lib/errors';
import { accountUrl } from './lib/stellar';

const short = (pk: string) => `${pk.slice(0, 4)}…${pk.slice(-4)}`;

export default function App() {
  const {
    address,
    balance,
    loading,
    error,
    connect,
    disconnect,
    fund,
    refreshBalance,
    setError,
  } = useWallet();

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'fail'>('idle');
  const [result, setResult] = useState<{ hash: string; url: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError(null);
    setResult(null);
    setTxStatus('idle');

    if (!to.startsWith('G') || to.length !== 56) {
      setError('Enter a valid Stellar public key (starts with G, 56 chars).');
      return;
    }
    if (!(Number(amount) > 0)) {
      setError('Enter an amount greater than 0.');
      return;
    }

    setSending(true);
    setTxStatus('pending');
    try {
      const res = await sendXlm(address, to, amount);
      setResult(res);
      setTxStatus('success');
      setTo('');
      setAmount('');
      await refreshBalance(address);
    } catch (err) {
      setTxStatus('fail');
      setError(walletErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">PayLink</h1>
            <p className="text-sm text-slate-400">
              Payment requests on Stellar · Testnet · White Belt
            </p>
          </div>
          {address ? (
            <button
              type="button"
              onClick={disconnect}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
            >
              Disconnect ({short(address)})
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={loading}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Connect Freighter'}
            </button>
          )}
        </header>

        <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
          Level 1 shell: connect a wallet, check your XLM balance, and send a testnet payment.
          Later belts add on-chain payment requests, multi-wallet, and receipt tokens.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {!address ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
            Connect{' '}
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Freighter
            </a>{' '}
            (network set to <span className="text-slate-200">Testnet</span>) to view your balance
            and send XLM.
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-400">Balance</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {balance ?? '—'}{' '}
                    <span className="text-lg font-normal text-slate-400">XLM</span>
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">{address}</p>
                </div>
                <div className="flex flex-row gap-2 sm:flex-col">
                  <button
                    type="button"
                    onClick={() => refreshBalance(address)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium hover:bg-slate-700"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={fund}
                    disabled={loading}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {loading ? 'Funding…' : 'Fund (Friendbot)'}
                  </button>
                </div>
              </div>
              <a
                href={accountUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs text-indigo-400 hover:underline"
              >
                View account on explorer ↗
              </a>
            </section>

            <form
              onSubmit={handleSend}
              className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6"
            >
              <h2 className="text-lg font-semibold">Send XLM</h2>
              <p className="text-xs text-slate-500">
                The raw pay primitive PayLink is built on — later you&apos;ll create a request
                link instead of pasting an address.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Destination address</span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value.trim())}
                  placeholder="G…"
                  autoComplete="off"
                  spellCheck={false}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Amount (XLM)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="1.0"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </label>
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send payment'}
              </button>
            </form>

            {txStatus === 'pending' && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Transaction pending — approve in Freighter if prompted…
              </div>
            )}

            {result && txStatus === 'success' && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
                <p className="font-medium text-emerald-300">Transaction successful ✓</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-300">{result.hash}</p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-indigo-400 hover:underline"
                >
                  View transaction on explorer ↗
                </a>
              </div>
            )}

            {txStatus === 'fail' && !error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Transaction failed.
              </div>
            )}
          </>
        )}

        <footer className="border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
          Stellar Testnet · Rise In Journey to Mastery · PayLink L1
        </footer>
      </div>
    </div>
  );
}
