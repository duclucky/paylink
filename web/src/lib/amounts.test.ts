import { describe, it, expect } from 'vitest';
import { xlmToStroops, stroopsToXlm } from './amounts';

describe('amounts', () => {
  it('converts whole XLM to stroops', () => {
    expect(xlmToStroops('1')).toBe(10_000_000n);
    expect(xlmToStroops('2')).toBe(20_000_000n);
  });

  it('converts fractional XLM', () => {
    expect(xlmToStroops('1.5')).toBe(15_000_000n);
    expect(xlmToStroops('0.0000001')).toBe(1n);
  });

  it('round-trips stroops to XLM', () => {
    expect(stroopsToXlm(10_000_000n)).toBe('1');
    expect(stroopsToXlm(15_000_000n)).toBe('1.5');
    expect(stroopsToXlm(1n)).toBe('0.0000001');
  });
});
