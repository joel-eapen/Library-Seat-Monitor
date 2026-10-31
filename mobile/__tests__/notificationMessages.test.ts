import { describe, expect, it } from 'vitest';
import { buildNotificationContent } from '../src/notifications/notificationMessages';
import type { Seat } from '../src/types';

function seat(
  id: string,
  group: string,
  number: number,
  occupied = false
): Seat {
  return { id, group, number, occupied };
}

describe('buildNotificationContent', () => {
  it('describes a single freed seat', () => {
    const content = buildNotificationContent([seat('G-4', 'G', 4)]);

    expect(content.title).toBe('Seat G-4 is available');
    expect(content.body).toContain('Ground Floor');
    expect(content.data).toEqual({
      type: 'seats-available',
      floor: 'G',
      seats: 'G-4',
      count: '1',
    });
  });

  it('groups multiple seats on one floor', () => {
    const content = buildNotificationContent([
      seat('2-3', '2', 3),
      seat('2-1', '2', 1),
    ]);

    expect(content.title).toBe('2 seats just became available');
    expect(content.data.floor).toBe('2');
    expect(content.data.count).toBe('2');
    expect(content.data.seats).toContain('2-3');
  });

  it('summarizes seats across floors', () => {
    const content = buildNotificationContent([
      seat('G-1', 'G', 1),
      seat('1-1', '1', 1),
      seat('1-2', '1', 2),
    ]);

    expect(content.title).toBe('3 seats just became available');
    expect(content.body).toBe('Ground Floor: 1 · First Floor: 2');
    expect(content.data.floor).toBe('G');
  });
});
