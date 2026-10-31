import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../src/lib/time';

const now = 1_000_000;

describe('formatRelativeTime', () => {
  it('handles empty values', () => {
    expect(formatRelativeTime(null, now)).toBe('never');
  });

  it('formats recent timestamps', () => {
    expect(formatRelativeTime(now - 3000, now)).toBe('just now');
    expect(formatRelativeTime(now - 15000, now)).toBe('15s ago');
    expect(formatRelativeTime(now - 120000, now)).toBe('2m ago');
    expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe('3h ago');
    expect(formatRelativeTime(now - 2 * 86400_000, now)).toBe('2d ago');
  });
});
