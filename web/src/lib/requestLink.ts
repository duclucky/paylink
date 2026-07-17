/** Build a shareable path+query for a payment request id. */
export function buildRequestLink(id: number, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  return `${base}${path}?id=${id}`;
}

/**
 * Parse `?id=<n>` from a query string or full URL.
 * Returns null if missing/invalid.
 */
export function parseRequestId(searchOrUrl: string): number | null {
  try {
    const q = searchOrUrl.includes('?')
      ? searchOrUrl.slice(searchOrUrl.indexOf('?'))
      : searchOrUrl.startsWith('id=')
        ? `?${searchOrUrl}`
        : searchOrUrl;
    const params = new URLSearchParams(
      q.startsWith('?') ? q : new URL(searchOrUrl, 'http://local').search,
    );
    const raw = params.get('id');
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 0xffff_ffff) return null;
    return n;
  } catch {
    return null;
  }
}

/** Read request id from the current browser location. */
export function requestIdFromLocation(): number | null {
  if (typeof window === 'undefined') return null;
  return parseRequestId(window.location.search);
}
