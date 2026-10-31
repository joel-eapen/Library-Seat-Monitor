import { describe, expect, it } from 'vitest';
import {
  FLOOR_MAPS,
  getFloorMapLayout,
  layoutSeatNumbers,
  type FloorMapLayout,
} from '../src/lib/floorMaps';

function expectCompleteLayout(layout: FloorMapLayout, total: number) {
  const numbers = layoutSeatNumbers(layout);

  expect(numbers).toHaveLength(total);
  expect(new Set(numbers).size).toBe(total);
  expect([...numbers].sort((a, b) => a - b)).toEqual(
    Array.from({ length: total }, (_, index) => index + 1)
  );
}

describe('floor maps', () => {
  it('covers all ground-floor seats exactly once', () => {
    expectCompleteLayout(FLOOR_MAPS.G, 42);
  });

  it('covers all first-floor seats exactly once', () => {
    expectCompleteLayout(FLOOR_MAPS['1'], 114);
  });

  it('covers all second-floor seats exactly once', () => {
    expectCompleteLayout(FLOOR_MAPS['2'], 144);
  });

  it('covers the third-floor live feed plus the six plan-only seats', () => {
    const numbers = layoutSeatNumbers(FLOOR_MAPS['3']);
    const liveNumbers = numbers.filter((number) => number <= 90);
    const planOnlyNumbers = numbers.filter((number) => number > 90);

    expect(numbers).toHaveLength(96);
    expect(new Set(numbers).size).toBe(96);
    expect([...liveNumbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 90 }, (_, index) => index + 1)
    );
    expect([...planOnlyNumbers].sort((a, b) => a - b)).toEqual([
      91, 92, 93, 94, 95, 96,
    ]);
  });

  it('keeps every seat row inside its section width', () => {
    for (const layout of Object.values(FLOOR_MAPS)) {
      const sections = [
        ...(layout.sections ?? []),
        ...(layout.bands ?? []).flatMap((band) => band.sections),
      ];

      for (const section of sections) {
        for (const item of section.items) {
          if (item.type !== 'seats') {
            continue;
          }
          for (const row of item.rows) {
            expect(row.length).toBeLessThanOrEqual(section.widthUnits);
            expect(row.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('has custom maps for all four floors', () => {
    expect(getFloorMapLayout('G')).toBe(FLOOR_MAPS.G);
    expect(getFloorMapLayout('1')).toBe(FLOOR_MAPS['1']);
    expect(getFloorMapLayout('2')).toBe(FLOOR_MAPS['2']);
    expect(getFloorMapLayout('3')).toBe(FLOOR_MAPS['3']);
  });
});
