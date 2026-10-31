export type FloorMapCluster = {
  rows: number[][];
  tableAfterRows: number[];
};

export type FloorMapLayout = {
  title: string;
  room: string;
  columns: number;
  clusters: FloorMapCluster[];
  leftSpace: boolean;
  markers: Array<{ label: string; tone: 'lift' | 'door' }>;
};

function seatRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export const FLOOR_MAPS: Record<string, FloorMapLayout> = {
  G: {
    title: 'Ground Floor',
    room: 'Reading Hall',
    columns: 6,
    clusters: [
      {
        rows: [seatRange(1, 6), seatRange(7, 12), seatRange(13, 18)],
        tableAfterRows: [0, 1],
      },
      {
        rows: [seatRange(19, 24), seatRange(25, 30)],
        tableAfterRows: [0],
      },
      {
        rows: [seatRange(31, 36), seatRange(37, 42)],
        tableAfterRows: [0],
      },
    ],
    leftSpace: true,
    markers: [
      { label: 'LIFT', tone: 'lift' },
      { label: 'DOOR', tone: 'door' },
    ],
  },
};

export function getFloorMapLayout(group: string): FloorMapLayout | null {
  return FLOOR_MAPS[group] ?? null;
}

export function layoutSeatNumbers(layout: FloorMapLayout): number[] {
  return layout.clusters.flatMap((cluster) => cluster.rows.flat());
}
