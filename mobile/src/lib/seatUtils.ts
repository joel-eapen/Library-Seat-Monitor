import type {
  GroupSummary,
  Seat,
  SeatSnapshot,
  SeatSummary,
} from '../types';

type RawSeat = {
  occupied?: unknown;
  studentId?: unknown;
};

type RawResponse = {
  event?: unknown;
  data?: unknown;
};

const GROUP_LABELS: Record<string, string> = {
  G: 'Ground Floor',
  '1': 'First Floor',
  '2': 'Second Floor',
  '3': 'Third Floor',
};

export function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? `Section ${group}`;
}

export function compareGroups(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a === 'G') {
    return -1;
  }
  if (b === 'G') {
    return 1;
  }

  const aNumeric = /^\d+$/.test(a) ? Number(a) : null;
  const bNumeric = /^\d+$/.test(b) ? Number(b) : null;

  if (aNumeric !== null && bNumeric !== null) {
    return aNumeric - bNumeric;
  }
  if (aNumeric !== null) {
    return -1;
  }
  if (bNumeric !== null) {
    return 1;
  }
  return a.localeCompare(b);
}

export function parseSeatId(id: string): { group: string; number: number } {
  const match = id.match(/^(.+)-(\d+)$/);
  if (!match) {
    return { group: id, number: 0 };
  }
  return { group: match[1], number: Number(match[2]) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSeatsResponse(raw: unknown): Seat[] {
  if (!isRecord(raw)) {
    throw new Error('Seat API returned an invalid response');
  }

  const response = raw as RawResponse;
  if (response.event !== 'all-seats' || !isRecord(response.data)) {
    throw new Error('Seat API returned an unexpected payload');
  }

  return Object.entries(response.data).map(([id, value]) => {
    if (!isRecord(value)) {
      throw new Error(`Invalid seat entry for ${id}`);
    }
    const seat = value as RawSeat;
    if (typeof seat.occupied !== 'boolean') {
      throw new Error(`Missing occupied value for ${id}`);
    }
    const parsed = parseSeatId(id);
    return {
      id,
      group: parsed.group,
      number: parsed.number,
      occupied: seat.occupied,
    };
  });
}

function summarize(seats: Seat[]): SeatSummary {
  const occupied = seats.filter((seat) => seat.occupied).length;
  return {
    total: seats.length,
    occupied,
    available: seats.length - occupied,
  };
}

export function buildSnapshot(seats: Seat[], fetchedAt: number): SeatSnapshot {
  const sorted = [...seats].sort((a, b) => {
    const groupComparison = compareGroups(a.group, b.group);
    if (groupComparison !== 0) {
      return groupComparison;
    }
    if (a.number !== b.number) {
      return a.number - b.number;
    }
    return a.id.localeCompare(b.id);
  });

  const byGroup = new Map<string, Seat[]>();
  for (const seat of sorted) {
    const groupSeats = byGroup.get(seat.group) ?? [];
    groupSeats.push(seat);
    byGroup.set(seat.group, groupSeats);
  }

  const groups: GroupSummary[] = [...byGroup.entries()]
    .sort(([a], [b]) => compareGroups(a, b))
    .map(([key, groupSeats]) => ({
      key,
      label: groupLabel(key),
      ...summarize(groupSeats),
    }));

  return {
    seats: sorted,
    byId: Object.fromEntries(sorted.map((seat) => [seat.id, seat])),
    groups,
    summary: summarize(sorted),
    fetchedAt,
  };
}

/** The library is treated as closed when it has seats and none are occupied. */
export function isLibraryClosed(snapshot: SeatSnapshot | null): boolean {
  return (
    snapshot !== null &&
    snapshot.summary.total > 0 &&
    snapshot.summary.occupied === 0
  );
}

export function detectNewlyAvailable(
  previous: SeatSnapshot | null,
  current: SeatSnapshot
): Seat[] {
  if (!previous) {
    return [];
  }

  return current.seats.filter((seat) => {
    const previousSeat = previous.byId[seat.id];
    return previousSeat?.occupied === true && seat.occupied === false;
  });
}

export function filterSeatsByFloors(seats: Seat[], floors: string[]): Seat[] {
  const allowed = new Set(floors);
  return seats.filter((seat) => allowed.has(seat.group));
}

export function groupSeatsByFloor(seats: Seat[]): Map<string, Seat[]> {
  const groups = new Map<string, Seat[]>();
  for (const seat of seats) {
    const groupSeats = groups.get(seat.group) ?? [];
    groupSeats.push(seat);
    groups.set(seat.group, groupSeats);
  }
  return groups;
}
