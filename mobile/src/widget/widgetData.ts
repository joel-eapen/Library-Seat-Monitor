import type { SeatSnapshot } from '../types';

export type SeatWidgetFloor = {
  key: string;
  available: number;
  total: number;
};

export type SeatWidgetProps = {
  total: number;
  available: number;
  occupied: number;
  floors: SeatWidgetFloor[];
  updatedAt: number | null;
  stale: boolean;
  empty: boolean;
  width?: number;
};

export function toWidgetProps(
  snapshot: SeatSnapshot | null,
  options: { stale?: boolean; empty?: boolean } = {}
): SeatWidgetProps {
  if (!snapshot) {
    return {
      total: 0,
      available: 0,
      occupied: 0,
      floors: [],
      updatedAt: null,
      stale: options.stale ?? false,
      empty: true,
    };
  }

  return {
    total: snapshot.summary.total,
    available: snapshot.summary.available,
    occupied: snapshot.summary.occupied,
    floors: snapshot.groups.map((group) => ({
      key: group.key,
      available: group.available,
      total: group.total,
    })),
    updatedAt: snapshot.fetchedAt,
    stale: options.stale ?? false,
    empty: options.empty ?? false,
  };
}
