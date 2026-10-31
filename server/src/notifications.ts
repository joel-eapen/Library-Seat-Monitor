import { compareSeats, floorLabel } from './seats.js';
import type { PushNotification, Seat, Subscription } from './types.js';

export function buildNotificationMessages(
  token: string,
  seats: Seat[]
): Array<PushNotification & { token: string }> {
  const byFloor = new Map<string, Seat[]>();
  for (const seat of seats) {
    const floorSeats = byFloor.get(seat.floor) ?? [];
    floorSeats.push(seat);
    byFloor.set(seat.floor, floorSeats);
  }

  return [...byFloor.entries()].map(([floor, floorSeats]) => {
    const sorted = [...floorSeats].sort(compareSeats);
    const count = sorted.length;

    return {
      token,
      title:
        count === 1
          ? `Seat ${sorted[0].id} is available`
          : `${count} seats just became available`,
      body:
        count === 1
          ? `${floorLabel(floor)} · Tap to view the live map`
          : `${floorLabel(floor)} · ${sorted.length} seats free now`,
      data: {
        type: 'seats-available',
        floor,
        seats: sorted.map((seat) => seat.id).join(','),
        count: String(count),
      },
    };
  });
}

export function seatsForSubscription(
  seats: Seat[],
  subscription: Subscription
): Seat[] {
  const floors = new Set(subscription.floors);
  return seats.filter((seat) => floors.has(seat.floor));
}
