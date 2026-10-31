import { groupLabel, groupSeatsByFloor } from '../lib/seatUtils';
import type { Seat } from '../types';

export type NotificationContent = {
  title: string;
  body: string;
  data: {
    type: string;
    floor: string;
    seats: string;
    count: string;
  };
};

export function buildNotificationContent(seats: Seat[]): NotificationContent {
  const byFloor = groupSeatsByFloor(seats);
  const floorKeys = [...byFloor.keys()];
  const firstFloor = floorKeys[0] ?? '';
  const total = seats.length;

  let title: string;
  let body: string;

  if (total === 1) {
    const seat = seats[0];
    title = `Seat ${seat.id} is available`;
    body = `${groupLabel(seat.group)} · Tap to view the live map`;
  } else if (floorKeys.length === 1) {
    title = `${total} seats just became available`;
    body = `${groupLabel(firstFloor)} · Tap to view the live map`;
  } else {
    title = `${total} seats just became available`;
    body = floorKeys
      .map(
        (floor) =>
          `${groupLabel(floor)}: ${byFloor.get(floor)?.length ?? 0}`
      )
      .join(' · ');
  }

  return {
    title,
    body,
    data: {
      type: 'seats-available',
      floor: firstFloor,
      seats: seats.map((seat) => seat.id).join(','),
      count: String(total),
    },
  };
}

/** Mirrors the relay's single "library closed" push (type: library-closed). */
export function buildLibraryClosedContent(): NotificationContent {
  return {
    title: 'Library is closed',
    body: 'All seats are unoccupied.',
    data: {
      type: 'library-closed',
      floor: '',
      seats: '',
      count: '0',
    },
  };
}
