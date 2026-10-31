import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Seat } from '../types';

type Props = {
  seat: Seat;
  size: number;
  highlighted: boolean;
};

export function SeatTile({ seat, size, highlighted }: Props) {
  const label = seat.number > 0 ? String(seat.number) : seat.id;
  const status = seat.occupied ? 'occupied' : 'available';

  return (
    <View
      accessible
      accessibilityLabel={`Seat ${seat.id}, ${status}`}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.min(9, Math.max(5, size * 0.18)),
          backgroundColor: seat.occupied
            ? colors.occupiedBg
            : colors.availableBg,
          borderColor: highlighted
            ? colors.warning
            : seat.occupied
              ? colors.occupiedBorder
              : colors.availableBorder,
          borderWidth: highlighted ? 2 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.number,
          {
            color: seat.occupied ? colors.occupied : colors.available,
            fontSize: Math.max(10, Math.min(16, size * 0.3)),
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontWeight: '700',
  },
});
