import { describe, expect, it } from 'vitest';
import { buildNotificationMessages } from '../src/notifications.js';
import { parseSeatsPayload, toSeatMap } from '../src/seats.js';
import { detectFreedSeats } from '../src/transitions.js';

const payload = {
  event: 'all-seats',
  data: {
    'G-1': { occupied: false, studentId: null },
    'G-2': { occupied: true, studentId: 'x' },
    '1-10': { occupied: false, studentId: null },
    '3-1': { occupied: true, studentId: null },
  },
};

describe('parseSeatsPayload', () => {
  it('parses seat ids and occupancy', () => {
    const seats = parseSeatsPayload(payload);
    expect(seats).toHaveLength(4);
    expect(seats.find((seat) => seat.id === '1-10')).toEqual({
      id: '1-10',
      floor: '1',
      number: 10,
      occupied: false,
    });
  });

  it('rejects malformed payloads', () => {
    expect(() => parseSeatsPayload({ event: 'wrong', data: {} })).toThrow(
      'unexpected payload'
    );
    expect(() =>
      parseSeatsPayload({
        event: 'all-seats',
        data: { 'G-1': { occupied: 'no' } },
      })
    ).toThrow('Invalid seat entry');
  });
});

describe('detectFreedSeats', () => {
  it('detects occupied to free transitions only', () => {
    const previous = toSeatMap(parseSeatsPayload(payload));
    const current = parseSeatsPayload({
      ...payload,
      data: {
        ...payload.data,
        'G-2': { occupied: false, studentId: null },
        '3-1': { occupied: true, studentId: null },
      },
    });

    expect(detectFreedSeats(previous, current).map((seat) => seat.id)).toEqual(
      ['G-2']
    );
  });

  it('returns nothing without a baseline', () => {
    expect(
      detectFreedSeats(null, parseSeatsPayload(payload))
    ).toEqual([]);
  });
});

describe('buildNotificationMessages', () => {
  it('groups seats by floor and sorts them', () => {
    const messages = buildNotificationMessages(
      'ExpoPushToken[test]',
      parseSeatsPayload(payload).filter(
        (seat) => seat.floor === 'G' && !seat.occupied
      )
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].title).toBe('Seat G-1 is available');
    expect(messages[0].data).toEqual({
      type: 'seats-available',
      floor: 'G',
      seats: 'G-1',
      count: '1',
    });
  });

  it('creates one message per floor', () => {
    const seats = parseSeatsPayload(payload);
    const messages = buildNotificationMessages(
      'ExpoPushToken[test]',
      seats.filter((seat) => !seat.occupied)
    );

    expect(messages.map((message) => message.data.floor)).toEqual([
      'G',
      '1',
    ]);
  });
});
