const STROOPS = 10_000_000n;

/** Parse a decimal XLM string into stroops (i128 / bigint). */
export function xlmToStroops(xlm: string): bigint {
  const t = xlm.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error('INVALID_AMOUNT');
  const [whole, frac = ''] = t.split('.');
  const fracPadded = (frac + '0000000').slice(0, 7);
  return BigInt(whole) * STROOPS + BigInt(fracPadded);
}

/** Format stroops as a human-readable XLM string (trim trailing zeros). */
export function stroopsToXlm(stroops: bigint): string {
  const neg = stroops < 0n;
  const v = neg ? -stroops : stroops;
  const whole = v / STROOPS;
  const frac = (v % STROOPS).toString().padStart(7, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/** Horizon payment amount string from stroops. */
export function stroopsToHorizonAmount(stroops: bigint): string {
  return stroopsToXlm(stroops);
}
