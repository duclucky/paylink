import { useCallback, useEffect, useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { sendXlm } from './lib/payments';
import { walletErrorMessage } from './lib/errors';
import { accountUrl, contractUrl, txUrl } from './lib/stellar';
import { xlmToStroops, stroopsToXlm, stroopsToHorizonAmount } from './lib/amounts';
import {
  createRequest,
  getRequest,
  payRequest,
  getReceiptBalance,
  PAYREQUEST_ID,
  RECEIPT_ID,
  type Request,
} from './lib/contracts';
import {
  buildRequestLink,
  parseRequestId,
  requestIdFromLocation,
} from './lib/requestLink';
import { pollPayRequestEvents, recentStartLedger, type PayLinkEvent } from './lib/events';

const short = (pk: string) => `${pk.slice(0, 4)}…${pk.slice(-4)}`;

type TxStatus = 'idle' | 'pending' | 'success' | 'fail';

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

  // Classic send
  const [to, setTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);

  // Create request
  const [createAmount, setCreateAmount] = useState('1');
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  // Pay request
  const [payIdInput, setPayIdInput] = useState('');
  const [activeRequest, setActiveRequest] = useState<Request | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [paying, setPaying] = useState(false);

  // Receipt + events
  const [receiptBal, setReceiptBal] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<PayLinkEvent[]>([]);
  const [ledgerCursor, setLedgerCursor] = useState<number | null>(null);

  // Shared tx status
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [result, setResult] = useState<{ hash: string; url: string; label?: string } | null>(
    null,
  );

  const refreshReceipt = useCallback(async (pk: string) => {
    try {
      const b = await getReceiptBalance(pk);
      setReceiptBal(stroopsToXlm(b));
    } catch {
      setReceiptBal(null);
    }
  }, []);

  useEffect(() => {
    if (address) refreshReceipt(address).catch(() => {});
  }, [address, refreshReceipt]);

  // Deep-link: ?id=
  useEffect(() => {
    const id = requestIdFromLocation();
    if (id != null) setPayIdInput(String(id));
  }, []);

  // Load request when pay id changes
  useEffect(() => {
    const id = parseRequestId(`?id=${payIdInput}`) ?? (Number(payIdInput) > 0 ? Number(payIdInput) : null);
    if (id == null) {
      setActiveRequest(null);
      return;
    }
    let cancelled = false;
    setLoadingRequest(true);
    getRequest(id)
      .then((req) => {
        if (!cancelled) setActiveRequest(req);
      })
      .catch(() => {
        if (!cancelled) setActiveRequest(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRequest(false);
      });
    return () => {
      cancelled = true;
    };
  }, [payIdInput, result]);

  // Event polling (cursor held in a ref-like local via state init)
  useEffect(() => {
    let cancelled = false;
    let cursor = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      cursor = await recentStartLedger(1500);
      if (cancelled) return;
      setLedgerCursor(cursor);

      const tick = async () => {
        if (cancelled || cursor < 1) return;
        try {
          const { events, latestLedger } = await pollPayRequestEvents(cursor);
          if (events.length) {
            setLiveEvents((prev) => [...events, ...prev].slice(0, 20));
            if (address && events.some((e) => e.kind === 'paid')) {
              refreshReceipt(address).catch(() => {});
              const id = Number(payIdInput);
              if (id > 0) getRequest(id).then(setActiveRequest).catch(() => {});
            }
          }
          if (latestLedger >= cursor) cursor = latestLedger + 1;
          setLedgerCursor(cursor);
        } catch {
          /* RPC gaps are fine; retry next interval */
        }
      };

      timer = setInterval(tick, 5000);
      await tick();
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [address, payIdInput, refreshReceipt]);

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
    if (!(Number(sendAmount) > 0)) {
      setError('Enter an amount greater than 0.');
      return;
    }

    setSending(true);
    setTxStatus('pending');
    try {
      const res = await sendXlm(address, to, sendAmount);
      setResult({ ...res, label: 'XLM payment' });
      setTxStatus('success');
      setTo('');
      setSendAmount('');
      await refreshBalance(address);
    } catch (err) {
      setTxStatus('fail');
      setError(walletErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError(null);
    setResult(null);
    setShareLink(null);
    setCreatedId(null);

    let stroops: bigint;
    try {
      stroops = xlmToStroops(createAmount);
      if (stroops <= 0n) throw new Error('INVALID_AMOUNT');
    } catch {
      setError('Enter a valid XLM amount greater than 0.');
      return;
    }

    setCreating(true);
    setTxStatus('pending');
    try {
      const res = await createRequest(address, stroops);
      setCreatedId(res.id);
      setShareLink(buildRequestLink(res.id));
      setPayIdInput(String(res.id));
      setResult({ hash: res.hash, url: res.url, label: `Request #${res.id} created` });
      setTxStatus('success');
      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set('id', String(res.id));
      window.history.replaceState({}, '', url.toString());
    } catch (err) {
      setTxStatus('fail');
      setError(walletErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handlePay() {
    if (!address || !activeRequest) return;
    const id = Number(payIdInput);
    if (!(id > 0)) {
      setError('Enter a valid request id.');
      return;
    }
    if (activeRequest.paid) {
      setError('This request is already paid.');
      return;
    }

    setError(null);
    setResult(null);
    setPaying(true);
    setTxStatus('pending');
    try {
      // Fallback value transfer: classic XLM to creator, then contract pay (mint receipt).
      const amountXlm = stroopsToHorizonAmount(BigInt(activeRequest.amount));
      const payment = await sendXlm(address, activeRequest.creator, amountXlm);
      const paid = await payRequest(id, address);
      setResult({
        hash: paid.hash || payment.hash,
        url: paid.url || payment.url || txUrl(payment.hash),
        label: `Paid request #${id} + receipt minted`,
      });
      setTxStatus('success');
      const req = await getRequest(id);
      setActiveRequest(req);
      await refreshBalance(address);
      await refreshReceipt(address);
    } catch (err) {
      setTxStatus('fail');
      setError(walletErrorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6 sm:max-w-2xl sm:gap-6 sm:py-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">PayLink</h1>
            <p className="text-sm text-slate-400">
              Payment requests · receipts on-chain · Stellar Testnet · Orange Belt
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
              {loading ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
        </header>

        <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
          Create an on-chain payment request, share the link, and payers settle XLM + mint a{' '}
          <span className="text-slate-200">ReceiptToken</span> via inter-contract call.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {txStatus === 'pending' && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Transaction pending — approve in your wallet…
          </div>
        )}

        {result && txStatus === 'success' && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-emerald-300">
              {result.label ?? 'Transaction successful'} ✓
            </p>
            <p className="mt-1 break-all font-mono text-xs text-slate-300">{result.hash}</p>
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-indigo-400 hover:underline"
              >
                View on explorer ↗
              </a>
            )}
          </div>
        )}

        {!address ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
            Connect a Stellar wallet (Freighter, xBull, Albedo, Lobstr, …) on{' '}
            <span className="text-slate-200">Testnet</span> to create or pay a request.
          </div>
        ) : (
          <>
            {/* Balances */}
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-400">XLM balance</p>
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {balance ?? '—'}{' '}
                  <span className="text-base font-normal text-slate-400">XLM</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
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
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-400">Receipt balance</p>
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {receiptBal ?? '—'}{' '}
                  <span className="text-base font-normal text-slate-400">units</span>
                </p>
                <button
                  type="button"
                  onClick={() => refreshReceipt(address)}
                  className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium hover:bg-slate-700"
                >
                  Refresh receipts
                </button>
              </div>
              <p className="break-all font-mono text-xs text-slate-500 sm:col-span-2">
                {address}{' '}
                <a
                  href={accountUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  explorer ↗
                </a>
              </p>
            </section>

            {/* Create */}
            <form
              onSubmit={handleCreate}
              className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
            >
              <h2 className="text-lg font-semibold">Create payment request</h2>
              <p className="text-xs text-slate-500">
                Amount is stored on-chain in stroops. You get a shareable <code>?id=</code> link.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Amount (XLM)</span>
                <input
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="1.0"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </label>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create request'}
              </button>
              {shareLink && createdId != null && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm">
                  <p className="font-medium text-indigo-200">Request #{createdId}</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-300">{shareLink}</p>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mt-2 text-xs text-indigo-400 hover:underline"
                  >
                    Copy link
                  </button>
                </div>
              )}
            </form>

            {/* Pay */}
            <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Pay a request</h2>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Request id</span>
                <input
                  value={payIdInput}
                  onChange={(e) => setPayIdInput(e.target.value.trim())}
                  inputMode="numeric"
                  placeholder="1"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
                />
              </label>

              {loadingRequest && (
                <p className="text-sm text-slate-400">Loading request…</p>
              )}

              {activeRequest && !loadingRequest && (
                <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-400">Status</span>
                    <span
                      className={
                        activeRequest.paid
                          ? 'rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300'
                          : 'rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200'
                      }
                    >
                      {activeRequest.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <p className="mt-2">
                    Amount:{' '}
                    <span className="font-semibold tabular-nums">
                      {stroopsToXlm(BigInt(activeRequest.amount))} XLM
                    </span>
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    Creator: {activeRequest.creator}
                  </p>
                  {activeRequest.payer && (
                    <p className="mt-1 break-all text-xs text-slate-500">
                      Payer: {activeRequest.payer}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={paying || !activeRequest || activeRequest.paid}
                className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400 disabled:opacity-50"
              >
                {paying
                  ? 'Paying…'
                  : activeRequest?.paid
                    ? 'Already paid'
                    : 'Pay (XLM + mint receipt)'}
              </button>
              <p className="text-xs text-slate-500">
                Sends classic XLM to the creator, then calls <code>pay</code> so the contract
                mints your receipt on-chain.
              </p>
            </section>

            {/* Live events */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Live events</h2>
              <p className="mt-1 text-xs text-slate-500">
                Polling PayRequest contract events every 5s.
              </p>
              {liveEvents.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No recent events yet…</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                  {liveEvents.map((ev, i) => (
                    <li
                      key={`${ev.ledger}-${i}`}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs"
                    >
                      {ev.kind === 'created' && (
                        <span className="text-indigo-300">
                          created · id={ev.id} · ledger={ev.ledger}
                        </span>
                      )}
                      {ev.kind === 'paid' && (
                        <span className="text-emerald-300">
                          paid · id={ev.id} · ledger={ev.ledger}
                        </span>
                      )}
                      {ev.kind === 'other' && (
                        <span className="text-slate-400">
                          {ev.topic || 'event'} · ledger={ev.ledger}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Classic send (primitive) */}
            <details className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
              <summary className="cursor-pointer text-sm font-semibold text-slate-300">
                Classic send XLM (pay primitive)
              </summary>
              <form onSubmit={handleSend} className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-400">Destination</span>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value.trim())}
                    placeholder="G…"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-400">Amount (XLM)</span>
                  <input
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="1.0"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send payment'}
                </button>
              </form>
            </details>
          </>
        )}

        <footer className="space-y-1 border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
          <p>
            PayRequest{' '}
            <a
              className="text-indigo-500 hover:underline"
              href={contractUrl(PAYREQUEST_ID)}
              target="_blank"
              rel="noreferrer"
            >
              {short(PAYREQUEST_ID)}
            </a>{' '}
            · Receipt{' '}
            <a
              className="text-indigo-500 hover:underline"
              href={contractUrl(RECEIPT_ID)}
              target="_blank"
              rel="noreferrer"
            >
              {short(RECEIPT_ID)}
            </a>
          </p>
          <p>Stellar Testnet · Rise In · PayLink L3</p>
        </footer>
      </div>
    </div>
  );
}
