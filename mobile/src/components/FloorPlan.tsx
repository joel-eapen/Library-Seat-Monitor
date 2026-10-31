import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type {
  FloorMapItem,
  FloorMapLayout,
  FloorMapSection,
} from '../lib/floorMaps';
import { layoutSeatNumbers } from '../lib/floorMaps';
import { colors, spacing } from '../theme';
import type { GroupSummary, Seat } from '../types';
import { SeatTile } from './SeatTile';
import { SummaryBar } from './SummaryBar';

type Props = {
  group: GroupSummary;
  layout: FloorMapLayout;
  seats: Seat[];
  highlightSeats: string[];
};

const COLUMN_GAP = 6;
const ROW_GAP = 6;
const MIN_TILE = 32;
const MAX_TILE = 48;
const PAGE_MAX_WIDTH = 720;

function CrossLines() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const diagonal = Math.hypot(size.width, size.height);
  const angle = (Math.atan2(size.height, size.width) * 180) / Math.PI;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== size.width || height !== size.height) {
          setSize({ width, height });
        }
      }}
    >
      {diagonal > 0 ? (
        <>
          <View
            style={[
              styles.crossLine,
              {
                width: diagonal,
                left: (size.width - diagonal) / 2,
                top: size.height / 2,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
          <View
            style={[
              styles.crossLine,
              {
                width: diagonal,
                left: (size.width - diagonal) / 2,
                top: size.height / 2,
                transform: [{ rotate: `${-angle}deg` }],
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

export function FloorPlan({
  group,
  layout,
  seats,
  highlightSeats,
}: Props) {
  const { width } = useWindowDimensions();

  const {
    bandGap,
    bands,
    contentWidth,
    itemGap,
    pageWidth,
    scrollable,
    sectionGap,
    seatByNumber,
    tableHeight,
    tileSize,
    highlighted,
    unmonitoredCount,
  } = useMemo(() => {
    const page = Math.min(
      Math.max(240, width - spacing.lg * 2),
      PAGE_MAX_WIDTH
    );
    const layoutBands =
      layout.bands ??
      (layout.sections ? [{ sections: layout.sections }] : []);
    const maxUnits = Math.max(
      1,
      ...layoutBands.map(
        (band) =>
          band.sections.reduce(
            (sum, section) => sum + section.widthUnits,
            0
          ) +
          layout.sectionGapUnits *
            Math.max(0, band.sections.length - 1)
      )
    );
    const fitTile = page / maxUnits - COLUMN_GAP;
    const tile = Math.max(MIN_TILE, Math.min(MAX_TILE, fitTile));
    const cell = tile + COLUMN_GAP;
    const gap = Math.max(12, tile * layout.itemGapUnits);
    const sectionSpacing = cell * layout.sectionGapUnits;
    const bandSpacing = cell * (layout.bandGapUnits ?? 1.2);
    const bandsWithWidths = layoutBands.map((band) => {
      const widths = band.sections.map(
        (section) => section.widthUnits * cell
      );
      const totalWidth =
        widths.reduce((sum, value) => sum + value, 0) +
        sectionSpacing * Math.max(0, band.sections.length - 1);

      return { ...band, widths, totalWidth };
    });
    const content = Math.max(
      0,
      ...bandsWithWidths.map((band) => band.totalWidth)
    );
    const seatMap = new Map(seats.map((seat) => [seat.number, seat]));
    const plannedNumbers = layoutSeatNumbers(layout);

    return {
      bandGap: bandSpacing,
      bands: bandsWithWidths,
      contentWidth: content,
      itemGap: gap,
      pageWidth: page,
      scrollable: content > page + 1,
      sectionGap: sectionSpacing,
      seatByNumber: seatMap,
      tableHeight: Math.max(14, Math.min(18, tile * 0.42)),
      tileSize: tile,
      highlighted: new Set(highlightSeats),
      unmonitoredCount: plannedNumbers.filter(
        (number) => !seatMap.has(number)
      ).length,
    };
  }, [layout, seats, highlightSeats, width]);

  const renderRow = (
    row: number[],
    align: FloorMapSection['align'],
    sectionWidth: number
  ) => {
    const rowWidth =
      row.length * tileSize + Math.max(0, row.length - 1) * COLUMN_GAP;
    const offset =
      align === 'center'
        ? Math.max(0, (sectionWidth - rowWidth) / 2)
        : 0;

    return { offset, rowWidth };
  };

  const renderSeatItem = (
    item: Extract<FloorMapItem, { type: 'seats' }>,
    section: FloorMapSection,
    sectionWidth: number,
    key: string
  ) => (
    <View key={key} style={{ gap: ROW_GAP }}>
      {item.rows.map((row, rowIndex) => {
        const { offset, rowWidth } = renderRow(
          row,
          item.align ?? section.align,
          sectionWidth
        );
        return (
          <View key={`row-${rowIndex}`} style={{ gap: ROW_GAP }}>
            <View
              style={{
                flexDirection: 'row',
                gap: COLUMN_GAP,
                marginLeft: offset,
              }}
            >
              {row.map((number) => {
                const seat = seatByNumber.get(number);
                if (!seat) {
                  return (
                    <View
                      key={`missing-${number}`}
                      style={[
                        styles.missingTile,
                        {
                          width: tileSize,
                          height: tileSize,
                          borderRadius: Math.min(
                            9,
                            Math.max(5, tileSize * 0.18)
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.missingText}>—</Text>
                    </View>
                  );
                }
                return (
                  <SeatTile
                    key={seat.id}
                    seat={seat}
                    size={tileSize}
                    highlighted={highlighted.has(seat.id)}
                  />
                );
              })}
            </View>

            {item.tableAfterRows?.includes(rowIndex) ? (
              <View
                style={[
                  styles.table,
                  {
                    marginLeft: offset,
                    width: rowWidth,
                    height: tableHeight,
                  },
                ]}
                accessible
                accessibilityLabel="Table"
              >
                <Text style={styles.tableText}>TABLE</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  const renderSpaceItem = (
    item: Extract<FloorMapItem, { type: 'space' }>,
    width: number,
    key: string
  ) => (
    <View
      key={key}
      style={[
        styles.space,
        { width },
        item.stretch
          ? styles.spaceStretch
          : { height: (item.heightUnits ?? 1) * (tileSize + ROW_GAP) },
      ]}
      accessible
      accessibilityLabel={item.label}
    >
      {item.cross ? <CrossLines /> : null}
      <Text style={styles.spaceText}>{item.label}</Text>
    </View>
  );

  const renderSection = (
    section: FloorMapSection,
    sectionWidth: number,
    key: string
  ) => (
    <View key={key} style={{ width: sectionWidth }}>
      {section.label ? (
        <Text style={styles.sectionLabel} numberOfLines={1}>
          {section.label}
        </Text>
      ) : null}
      <View style={{ gap: itemGap, flex: 1 }}>
        {section.items.map((item, itemIndex) => {
          const itemKey = `${key}-item-${itemIndex}`;
          return item.type === 'seats'
            ? renderSeatItem(item, section, sectionWidth, itemKey)
            : renderSpaceItem(item, sectionWidth, itemKey);
        })}
      </View>
    </View>
  );

  const bandNodes = bands.map((band, bandIndex) => {
    const offset = (band.offsetUnits ?? 0) * (tileSize + COLUMN_GAP);

    return (
      <View key={`band-${bandIndex}`} style={{ width: contentWidth }}>
        {band.caption ? (
          <Text style={[styles.bandCaption, { marginLeft: offset }]}>
            {band.caption}
          </Text>
        ) : null}
        <View
          style={{
            marginLeft: offset,
            width: band.totalWidth,
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: sectionGap,
          }}
        >
          {band.sections.map((section, sectionIndex) =>
            renderSection(
              section,
              band.widths[sectionIndex] ?? 0,
              `band-${bandIndex}-section-${sectionIndex}`
            )
          )}
        </View>
      </View>
    );
  });

  const mapBody = (
    <View style={{ width: contentWidth, gap: bandGap }}>{bandNodes}</View>
  );

  const leftMarkers = layout.markers.filter(
    (marker) => marker.side === 'left'
  );
  const rightMarkers = layout.markers.filter(
    (marker) => marker.side === 'right'
  );
  const bottomSeatSize = Math.min(tileSize, 40);
  const markerWidth = Math.min(contentWidth, pageWidth);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.titleBar} />
        <Text style={styles.title} numberOfLines={2}>
          {layout.title} — {layout.room}
        </Text>
        <Text style={styles.count}>({group.total} SEATS)</Text>
      </View>

      <SummaryBar group={group} />

      {scrollable ? (
        <Text style={styles.scrollHint}>Swipe sideways to explore →</Text>
      ) : null}

      {unmonitoredCount > 0 ? (
        <Text style={styles.feedNote}>
          {unmonitoredCount} seat{unmonitoredCount === 1 ? '' : 's'} on this
          plan {unmonitoredCount === 1 ? 'is' : 'are'} not in the live feed.
        </Text>
      ) : null}

      {scrollable ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: pageWidth }}
        >
          {mapBody}
        </ScrollView>
      ) : (
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {mapBody}
        </View>
      )}

      <View style={[styles.markers, { width: markerWidth }]}>
        <View style={styles.markerGroup}>
          {leftMarkers.map((marker) => (
            <View
              key={marker.label}
              style={[
                styles.marker,
                marker.tone === 'lift' ? styles.lift : styles.door,
              ]}
              accessible
              accessibilityLabel={marker.label}
            >
              <Text style={styles.markerText}>{marker.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.markerGroup}>
          {(layout.bottomSeats ?? []).map((number) => {
            const seat = seatByNumber.get(number);
            if (!seat) {
              return null;
            }
            return (
              <SeatTile
                key={seat.id}
                seat={seat}
                size={bottomSeatSize}
                highlighted={highlighted.has(seat.id)}
              />
            );
          })}
          {rightMarkers.map((marker) => (
            <View
              key={marker.label}
              style={[
                styles.marker,
                marker.tone === 'lift' ? styles.lift : styles.door,
              ]}
              accessible
              accessibilityLabel={marker.label}
            >
              <Text style={styles.markerText}>{marker.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: PAGE_MAX_WIDTH,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  titleBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.occupied,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  count: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  scrollHint: {
    alignSelf: 'flex-end',
    color: colors.subtle,
    fontSize: 9,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  feedNote: {
    color: colors.subtle,
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bandCaption: {
    color: colors.subtle,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 4,
  },
  space: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  spaceStretch: {
    flex: 1,
  },
  crossLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  spaceText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  table: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b89a63',
    backgroundColor: '#dcc79b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableText: {
    color: '#7a5a20',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  missingTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  missingText: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '700',
  },
  markers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  markerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marker: {
    minWidth: 58,
    height: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  lift: {
    backgroundColor: '#a61b1b',
  },
  door: {
    backgroundColor: '#4b5563',
  },
  markerText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
});
