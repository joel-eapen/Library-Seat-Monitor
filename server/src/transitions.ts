import type { Seat, SeatMap } from './types.js';

export function detectFreedSeats(
  previous: SeatMap | null,
  current: Seat[]
): Seat[] {
  if (!previous) {
    return [];
  }

  return current.filter(
    (seat) => previous[seat.id] === true && seat.occupied === false
  );
}
