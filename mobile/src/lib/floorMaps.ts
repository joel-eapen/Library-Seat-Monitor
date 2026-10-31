export type FloorMapSeatItem = {
  type: 'seats';
  rows: number[][];
  tableAfterRows?: number[];
  align?: 'left' | 'center';
};

export type FloorMapSpaceItem = {
  type: 'space';
  label: string;
  heightUnits?: number;
  stretch?: boolean;
  cross?: boolean;
};

export type FloorMapItem = FloorMapSeatItem | FloorMapSpaceItem;

export type FloorMapSection = {
  widthUnits: number;
  align?: 'left' | 'center';
  label?: string;
  items: FloorMapItem[];
};

export type FloorMapBand = {
  caption?: string;
  offsetUnits?: number;
  sections: FloorMapSection[];
};

export type FloorMapMarker = {
  label: string;
  tone: 'lift' | 'door';
  side: 'left' | 'right';
};

export type FloorMapLayout = {
  title: string;
  room: string;
  sections?: FloorMapSection[];
  bands?: FloorMapBand[];
  sectionGapUnits: number;
  itemGapUnits: number;
  bandGapUnits?: number;
  bottomSeats?: number[];
  markers: FloorMapMarker[];
};

function seatRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export const FLOOR_MAPS: Record<string, FloorMapLayout> = {
  G: {
    title: 'Ground Floor',
    room: 'Reading Hall',
    sectionGapUnits: 0.3,
    itemGapUnits: 0.8,
    sections: [
      {
        widthUnits: 2,
        items: [{ type: 'space', label: 'SPACE', heightUnits: 4 }],
      },
      {
        widthUnits: 6,
        items: [
          {
            type: 'seats',
            rows: [seatRange(1, 6), seatRange(7, 12), seatRange(13, 18)],
            tableAfterRows: [0, 1],
          },
          {
            type: 'seats',
            rows: [seatRange(19, 24), seatRange(25, 30)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(31, 36), seatRange(37, 42)],
            tableAfterRows: [0],
          },
        ],
      },
    ],
    markers: [
      { label: 'LIFT', tone: 'lift', side: 'left' },
      { label: 'DOOR', tone: 'door', side: 'right' },
    ],
  },
  '1': {
    title: '1st Floor',
    room: 'Main Reading Hall',
    sectionGapUnits: 0.9,
    itemGapUnits: 0.8,
    sections: [
      {
        widthUnits: 8,
        align: 'center',
        items: [
          {
            type: 'seats',
            rows: [seatRange(1, 8), seatRange(9, 16)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(17, 24), seatRange(25, 32)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(33, 38), seatRange(39, 44)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(45, 50), seatRange(51, 56)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(57, 62), seatRange(63, 68)],
            tableAfterRows: [0],
          },
        ],
      },
      {
        widthUnits: 6,
        items: [
          {
            type: 'seats',
            rows: [[69, 70]],
          },
          {
            type: 'seats',
            rows: [seatRange(71, 76)],
            tableAfterRows: [0],
          },
          { type: 'space', label: 'SPACE', heightUnits: 2 },
          {
            type: 'seats',
            rows: [seatRange(77, 82), seatRange(83, 88)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(89, 94), seatRange(95, 100)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(101, 106), seatRange(107, 112)],
            tableAfterRows: [0],
          },
        ],
      },
    ],
    bottomSeats: [113, 114],
    markers: [
      { label: 'LIFT', tone: 'lift', side: 'left' },
      { label: 'DOOR', tone: 'door', side: 'right' },
    ],
  },
  '2': {
    title: '2nd Floor',
    room: 'Reading Hall',
    sectionGapUnits: 1,
    itemGapUnits: 0.8,
    sections: [
      {
        widthUnits: 6,
        items: [
          {
            type: 'seats',
            rows: [seatRange(1, 6), seatRange(7, 12), seatRange(13, 18)],
            tableAfterRows: [0, 1],
          },
          {
            type: 'seats',
            rows: [seatRange(19, 24), seatRange(25, 30)],
            tableAfterRows: [0],
          },
          { type: 'space', label: 'SPACE', heightUnits: 1.7 },
          {
            type: 'seats',
            rows: [seatRange(31, 36), seatRange(37, 42)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(43, 48), seatRange(49, 54)],
            tableAfterRows: [0],
          },
        ],
      },
      {
        widthUnits: 8,
        items: [
          {
            type: 'seats',
            rows: [[55, 56], seatRange(57, 64), [65, 66, 67, 68]],
            tableAfterRows: [1],
          },
          {
            type: 'seats',
            rows: [seatRange(69, 74), seatRange(75, 80)],
            tableAfterRows: [0],
            align: 'center',
          },
          {
            type: 'seats',
            rows: [seatRange(81, 86), seatRange(87, 92)],
            tableAfterRows: [0],
            align: 'center',
          },
          {
            type: 'seats',
            rows: [seatRange(93, 100), seatRange(101, 108)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(109, 116), seatRange(117, 124)],
            tableAfterRows: [0],
          },
          {
            type: 'seats',
            rows: [seatRange(125, 132), seatRange(133, 140)],
            tableAfterRows: [0, 1],
          },
        ],
      },
    ],
    bottomSeats: [141, 142, 143, 144],
    markers: [
      { label: 'LIFT', tone: 'lift', side: 'left' },
      { label: 'DOOR', tone: 'door', side: 'right' },
    ],
  },
  '3': {
    title: '3rd Floor',
    room: 'Reading Hall',
    sectionGapUnits: 1,
    itemGapUnits: 0.8,
    bandGapUnits: 1.4,
    bands: [
      {
        caption: 'TOP',
        sections: [
          {
            widthUnits: 8,
            items: [
              {
                type: 'seats',
                rows: [seatRange(1, 8), seatRange(9, 16)],
                tableAfterRows: [0],
              },
            ],
          },
          {
            widthUnits: 8,
            items: [
              {
                type: 'seats',
                rows: [seatRange(17, 24), seatRange(25, 32)],
                tableAfterRows: [0],
              },
            ],
          },
        ],
      },
      {
        sections: [
          {
            widthUnits: 2,
            label: 'LEFT WALL',
            items: [
              {
                type: 'seats',
                rows: [
                  [33, 34],
                  [35, 36],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [37, 38],
                  [39, 40],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [41, 42],
                  [43, 44],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [45, 46],
                  [47, 48],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [49, 50],
                  [51, 52],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [53, 54],
                  [55, 56],
                ],
                tableAfterRows: [0],
              },
            ],
          },
          {
            widthUnits: 11,
            items: [
              {
                type: 'space',
                label: 'OPEN SPACE',
                stretch: true,
                cross: true,
              },
            ],
          },
          {
            widthUnits: 2,
            label: 'RIGHT WALL',
            items: [
              {
                type: 'seats',
                rows: [
                  [57, 58],
                  [59, 60],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [61, 62],
                  [63, 64],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [65, 66],
                  [67, 68],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [69, 70],
                  [71, 72],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [73, 74],
                  [75, 76],
                ],
                tableAfterRows: [0],
              },
              {
                type: 'seats',
                rows: [
                  [77, 78],
                  [79, 80],
                ],
                tableAfterRows: [0],
              },
            ],
          },
        ],
      },
      {
        offsetUnits: 4.5,
        sections: [
          {
            widthUnits: 8,
            items: [
              {
                type: 'seats',
                rows: [seatRange(81, 88), seatRange(89, 96)],
                tableAfterRows: [0],
              },
            ],
          },
        ],
      },
    ],
    markers: [{ label: 'LIFT', tone: 'lift', side: 'left' }],
  },
};

export function getFloorMapLayout(group: string): FloorMapLayout | null {
  return FLOOR_MAPS[group] ?? null;
}

export function layoutSeatNumbers(layout: FloorMapLayout): number[] {
  const bands =
    layout.bands ??
    (layout.sections ? [{ sections: layout.sections }] : []);
  const mapNumbers = bands.flatMap((band) =>
    band.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.type === 'seats' ? item.rows.flat() : []
      )
    )
  );
  return [...mapNumbers, ...(layout.bottomSeats ?? [])];
}
