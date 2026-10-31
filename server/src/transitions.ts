import type { Seat, SeatMap } from './types.js';

export function areAllSeatsUnoccupied(seats: Seat[]): boolean {
  return seats.length > 0 && seats.every((seat) => !seat.occupied);
}

export function isSeatMapAllUnoccupied(seats: SeatMap): boolean {
  const values = Object.values(seats);
  return values.length > 0 && values.every((occupied) => !occupied);
}

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
