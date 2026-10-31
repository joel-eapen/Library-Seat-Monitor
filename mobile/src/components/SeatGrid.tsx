import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { spacing } from '../theme';
import type { Seat } from '../types';
import { SeatTile } from './SeatTile';

type Props = {
  seats: Seat[];
  highlightSeats: string[];
};

const GAP = 6;
const HORIZONTAL_PADDING = spacing.lg * 2;

export function SeatGrid({ seats, highlightSeats }: Props) {
  const { width } = useWindowDimensions();

  const { tileSize, rows } = useMemo(() => {
    const availableWidth = Math.max(240, width - HORIZONTAL_PADDING);
    const columnCount = Math.max(
      4,
      Math.min(8, Math.floor((availableWidth + GAP) / (54 + GAP)))
    );
    const size =
      (availableWidth - GAP * (columnCount - 1)) / columnCount;

    const chunked: Seat[][] = [];
    for (let index = 0; index < seats.length; index += columnCount) {
      chunked.push(seats.slice(index, index + columnCount));
    }

    return {
      tileSize: size,
      rows: chunked,
    };
  }, [seats, width]);

  const highlighted = useMemo(
    () => new Set(highlightSeats),
    [highlightSeats]
  );

  return (
    <View style={styles.container} accessibilityLabel={`${seats.length} seats`}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((seat) => (
            <SeatTile
              key={seat.id}
              seat={seat}
              size={tileSize}
              highlighted={highlighted.has(seat.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
});
