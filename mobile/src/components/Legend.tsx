import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function Legend() {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: colors.availableBg, borderColor: colors.availableBorder }]} />
        <Text style={styles.label}>Available</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: colors.occupiedBg, borderColor: colors.occupiedBorder }]} />
        <Text style={styles.label}>Occupied</Text>
      </View>
      <Text style={styles.hint}>
        Numbers are seats on the selected floor
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    color: colors.subtle,
    fontSize: 10,
    flexBasis: '100%',
  },
});
