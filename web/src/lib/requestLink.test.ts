import { describe, it, expect } from 'vitest';
import { parseRequestId, buildRequestLink } from './requestLink';

describe('parseRequestId', () => {
  it('parses query strings', () => {
    expect(parseRequestId('?id=1')).toBe(1);
    expect(parseRequestId('?id=42&x=1')).toBe(42);
  });

  it('parses full URLs', () => {
    expect(parseRequestId('https://example.com/app?id=7')).toBe(7);
  });

  it('returns null for invalid values', () => {
    expect(parseRequestId('')).toBeNull();
    expect(parseRequestId('?id=abc')).toBeNull();
    expect(parseRequestId('?id=0')).toBeNull();
    expect(parseRequestId('?id=-1')).toBeNull();
  });
});

describe('buildRequestLink', () => {
  it('builds a shareable link with id', () => {
    expect(buildRequestLink(3, 'https://paylink.app')).toContain('?id=3');
    expect(buildRequestLink(3, 'https://paylink.app')).toMatch(/^https:\/\/paylink\.app/);
  });
});
