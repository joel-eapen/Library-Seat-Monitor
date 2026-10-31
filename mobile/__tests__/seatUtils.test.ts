import { describe, expect, it } from 'vitest';
import {
  buildSnapshot,
  detectNewlyAvailable,
  filterSeatsByFloors,
  groupLabel,
  parseSeatId,
  parseSeatsResponse,
} from '../src/lib/seatUtils';

const payload = {
  event: 'all-seats',
  data: {
    'G-1': { occupied: false, studentId: null },
    'G-2': { occupied: true, studentId: 'x' },
    '1-10': { occupied: false, studentId: null },
    '1-2': { occupied: true, studentId: null },
    '2-1': { occupied: false, studentId: null },
    '3-4': { occupied: true, studentId: null },
  },
};

describe('parseSeatsResponse', () => {
  it('parses seats and derives groups', () => {
    const seats = parseSeatsResponse(payload);

    expect(seats).toHaveLength(6);
    expect(seats.find((seat) => seat.id === '1-10')).toEqual({
      id: '1-10',
      group: '1',
      number: 10,
      occupied: false,
    });
  });

  it('rejects an unexpected event', () => {
    expect(() =>
      parseSeatsResponse({ event: 'other', data: {} })
    ).toThrow('unexpected payload');
  });

  it('rejects missing occupancy', () => {
    expect(() =>
      parseSeatsResponse({
        event: 'all-seats',
        data: { 'G-1': { studentId: null } },
      })
    ).toThrow('Missing occupied value');
  });
});

describe('parseSeatId', () => {
  it('splits a seat id into a floor and number', () => {
    expect(parseSeatId('G-12')).toEqual({ group: 'G', number: 12 });
    expect(parseSeatId('2-103')).toEqual({ group: '2', number: 103 });
    expect(parseSeatId('A')).toEqual({ group: 'A', number: 0 });
  });
});

describe('buildSnapshot', () => {
  it('orders groups naturally and seats by number', () => {
    const snapshot = buildSnapshot(parseSeatsResponse(payload), 1000);

    expect(snapshot.groups.map((group) => group.key)).toEqual([
      'G',
      '1',
      '2',
      '3',
    ]);
    expect(
      snapshot.seats
        .filter((seat) => seat.group === '1')
        .map((seat) => seat.number)
    ).toEqual([2, 10]);

    expect(snapshot.groups[0]).toMatchObject({
      key: 'G',
      label: 'Ground Floor',
      total: 2,
      available: 1,
      occupied: 1,
    });
    expect(snapshot.summary).toEqual({
      total: 6,
      available: 3,
      occupied: 3,
    });
    expect(snapshot.fetchedAt).toBe(1000);
  });
});

describe('detectNewlyAvailable', () => {
  it('returns only seats that changed from occupied to free', () => {
    const previous = buildSnapshot(parseSeatsResponse(payload), 1000);
    const current = buildSnapshot(
      parseSeatsResponse({
        ...payload,
        data: {
          ...payload.data,
          'G-2': { occupied: false, studentId: null },
          '1-2': { occupied: true, studentId: null },
          '3-4': { occupied: false, studentId: null },
        },
      }),
      2000
    );

    expect(
      detectNewlyAvailable(previous, current).map((seat) => seat.id)
    ).toEqual(['G-2', '3-4']);
  });

  it('returns nothing without a previous snapshot', () => {
    const current = buildSnapshot(parseSeatsResponse(payload), 1000);
    expect(detectNewlyAvailable(null, current)).toEqual([]);
  });
});

describe('filterSeatsByFloors', () => {
  it('keeps only seats in selected floors', () => {
    const seats = parseSeatsResponse(payload);
    expect(
      filterSeatsByFloors(seats, ['1', '3']).map((seat) => seat.id)
    ).toEqual(['1-10', '1-2', '3-4']);
  });
});

describe('groupLabel', () => {
  it('provides human-readable labels', () => {
    expect(groupLabel('G')).toBe('Ground Floor');
    expect(groupLabel('2')).toBe('Second Floor');
    expect(groupLabel('X')).toBe('Section X');
  });
});
