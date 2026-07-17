import { sorobanServer } from './stellar';
import { PAYREQUEST_ID } from './contracts';

export type PayLinkEvent =
  | { kind: 'created'; id: number; ledger: number }
  | { kind: 'paid'; id: number; ledger: number }
  | { kind: 'other'; topic: string; ledger: number };

function topicText(topic: unknown): string {
  if (topic == null) return '';
  if (typeof topic === 'string') return topic;
  if (typeof topic === 'object') return JSON.stringify(topic);
  return String(topic);
}

/**
 * Poll Soroban RPC for PayRequest contract events since `fromLedger`.
 * Returns new events and the next ledger cursor.
 */
export async function pollPayRequestEvents(
  fromLedger: number,
): Promise<{ events: PayLinkEvent[]; latestLedger: number }> {
  const res = await sorobanServer.getEvents({
    startLedger: fromLedger,
    filters: [{ type: 'contract', contractIds: [PAYREQUEST_ID] }],
    limit: 50,
  });

  const events: PayLinkEvent[] = [];
  for (const ev of res.events ?? []) {
    const topics = (ev.topic ?? []) as unknown[];
    const joined = topics.map(topicText).join(' ');
    const ledger = Number(ev.ledger ?? 0);

    if (/created/i.test(joined)) {
      events.push({ kind: 'created', id: 0, ledger });
    } else if (/paid/i.test(joined)) {
      events.push({ kind: 'paid', id: 0, ledger });
    } else {
      events.push({ kind: 'other', topic: joined.slice(0, 80), ledger });
    }
  }

  const latestLedger = Number(res.latestLedger ?? fromLedger);
  return { events, latestLedger };
}

/** Fetch a recent start ledger for first poll (RPC only keeps ~7 days). */
export async function recentStartLedger(lookback = 2000): Promise<number> {
  try {
    const latest = await sorobanServer.getLatestLedger();
    const seq = Number(latest.sequence ?? 0);
    return Math.max(1, seq - lookback);
  } catch {
    return 1;
  }
}
