import type { Seat, SeatMap } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSeatId(id: string): { floor: string; number: number } {
  const match = id.match(/^(.+)-(\d+)$/);
  if (!match) {
    return { floor: id, number: 0 };
  }
  return { floor: match[1], number: Number(match[2]) };
}

export function parseSeatsPayload(payload: unknown): Seat[] {
  if (!isRecord(payload)) {
    throw new Error('Seat API returned an invalid response');
  }

  if (payload.event !== 'all-seats' || !isRecord(payload.data)) {
    throw new Error('Seat API returned an unexpected payload');
  }

  return Object.entries(payload.data).map(([id, value]) => {
    if (!isRecord(value) || typeof value.occupied !== 'boolean') {
      throw new Error(`Invalid seat entry for ${id}`);
    }

    const parsed = parseSeatId(id);
    return {
      id,
      floor: parsed.floor,
      number: parsed.number,
      occupied: value.occupied,
    };
  });
}

export function toSeatMap(seats: Seat[]): SeatMap {
  return Object.fromEntries(
    seats.map((seat) => [seat.id, seat.occupied])
  );
}

export function compareSeats(a: Seat, b: Seat): number {
  if (a.floor === b.floor) {
    if (a.number !== b.number) {
      return a.number - b.number;
    }
    return a.id.localeCompare(b.id);
  }
  if (a.floor === 'G') {
    return -1;
  }
  if (b.floor === 'G') {
    return 1;
  }
  const aNumeric = /^\d+$/.test(a.floor) ? Number(a.floor) : null;
  const bNumeric = /^\d+$/.test(b.floor) ? Number(b.floor) : null;
  if (aNumeric !== null && bNumeric !== null) {
    return aNumeric - bNumeric;
  }
  return a.floor.localeCompare(b.floor);
}

export function floorLabel(floor: string): string {
  if (floor === 'G') {
    return 'Ground Floor';
  }
  if (floor === '1') {
    return 'First Floor';
  }
  if (floor === '2') {
    return 'Second Floor';
  }
  if (floor === '3') {
    return 'Third Floor';
  }
  return `Floor ${floor}`;
}
