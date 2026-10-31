import { describe, expect, it } from 'vitest';
import {
  FLOOR_MAPS,
  getFloorMapLayout,
  layoutSeatNumbers,
} from '../src/lib/floorMaps';

describe('floor maps', () => {
  it('covers all ground-floor seats exactly once', () => {
    const layout = FLOOR_MAPS.G;
    const numbers = layoutSeatNumbers(layout);

    expect(numbers).toHaveLength(42);
    expect(new Set(numbers).size).toBe(42);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(42);
    expect([...numbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 42 }, (_, index) => index + 1)
    );
  });

  it('keeps every ground-floor row at six columns', () => {
    const layout = FLOOR_MAPS.G;

    for (const cluster of layout.clusters) {
      for (const row of cluster.rows) {
        expect(row).toHaveLength(6);
      }
    }
  });

  it('only has a custom map for the ground floor', () => {
    expect(getFloorMapLayout('G')).toBe(FLOOR_MAPS.G);
    expect(getFloorMapLayout('1')).toBeNull();
    expect(getFloorMapLayout('2')).toBeNull();
    expect(getFloorMapLayout('3')).toBeNull();
  });
});
