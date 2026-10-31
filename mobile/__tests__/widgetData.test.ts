import { describe, expect, it } from 'vitest';
import { toWidgetProps } from '../src/widget/widgetData';
import type { SeatSnapshot } from '../src/types';

function snapshot(occupied: number, total = 2): SeatSnapshot {
  return {
    seats: [],
    byId: {},
    groups: [
      {
        key: 'G',
        label: 'Ground Floor',
        total,
        available: total - occupied,
        occupied,
      },
    ],
    summary: {
      total,
      available: total - occupied,
      occupied,
    },
    fetchedAt: 1_000_000,
  };
}

describe('widget data', () => {
  it('marks the library closed when every seat is unoccupied', () => {
    expect(toWidgetProps(snapshot(0)).closed).toBe(true);
  });

  it('does not mark the library closed when a seat is occupied', () => {
    expect(toWidgetProps(snapshot(1)).closed).toBe(false);
  });

  it('does not mark an empty widget as closed', () => {
    expect(toWidgetProps(null).closed).toBe(false);
  });
});
