import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { FloorMapLayout } from '../lib/floorMaps';
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
const CLUSTER_GAP = 18;
const LEFT_GAP = 10;

export function FloorPlan({
  group,
  layout,
  seats,
  highlightSeats,
}: Props) {
  const { width } = useWindowDimensions();

  const {
    tableHeight,
    tileSize,
    leftWidth,
    firstClusterHeight,
    seatByNumber,
    highlighted,
  } = useMemo(() => {
    const innerWidth = Math.min(
      Math.max(240, width - spacing.lg * 2),
      560
    );
    const left = layout.leftSpace
      ? Math.max(46, Math.min(86, innerWidth * 0.21))
      : 0;
    const seatAreaWidth =
      innerWidth - left - (layout.leftSpace ? LEFT_GAP : 0);
    const tile = Math.max(
      24,
      (seatAreaWidth - COLUMN_GAP * (layout.columns - 1)) /
        layout.columns
    );
    const table = Math.max(14, Math.min(18, tile * 0.42));
    const firstCluster = layout.clusters[0];
    const firstClusterItems =
      firstCluster.rows.length + firstCluster.tableAfterRows.length;
    const clusterHeight =
      firstCluster.rows.length * tile +
      firstCluster.tableAfterRows.length * table +
      Math.max(0, firstClusterItems - 1) * ROW_GAP;

    return {
      tableHeight: table,
      tileSize: tile,
      leftWidth: left,
      firstClusterHeight: clusterHeight,
      seatByNumber: new Map(seats.map((seat) => [seat.number, seat])),
      highlighted: new Set(highlightSeats),
    };
  }, [layout, seats, highlightSeats, width]);

  const seatAreaWidth =
    Math.min(Math.max(240, width - spacing.lg * 2), 560) -
    leftWidth -
    (layout.leftSpace ? LEFT_GAP : 0);

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

      <View style={styles.mapRow}>
        {layout.leftSpace ? (
          <View style={{ width: leftWidth }}>
            <View
              style={[styles.space, { height: firstClusterHeight }]}
              accessible
              accessibilityLabel="Open space"
            >
              <Text style={styles.spaceText}>SPACE</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.clusters, { width: seatAreaWidth }]}>
          {layout.clusters.map((cluster, clusterIndex) => (
            <View key={`cluster-${clusterIndex}`} style={styles.cluster}>
              {cluster.rows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.rowGroup}>
                  <View style={styles.seatRow}>
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

                  {cluster.tableAfterRows.includes(rowIndex) ? (
                    <View
                      style={[
                        styles.table,
                        {
                          width: seatAreaWidth,
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
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.markers}>
        {layout.markers.map((marker) => (
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
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
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
  mapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: LEFT_GAP,
  },
  space: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  spaceText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  clusters: {
    gap: CLUSTER_GAP,
  },
  cluster: {
    gap: ROW_GAP,
  },
  rowGroup: {
    gap: ROW_GAP,
  },
  seatRow: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
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
    marginTop: spacing.lg,
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
