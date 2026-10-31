import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { GroupSummary } from '../types';

type Props = {
  group: GroupSummary | null;
};

export function SummaryBar({ group }: Props) {
  if (!group) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <View
          style={[styles.dot, { backgroundColor: colors.available }]}
        />
        <Text style={styles.label}>Available:</Text>
        <Text style={[styles.value, { color: colors.available }]}>
          {group.available}
        </Text>
      </View>
      <View style={styles.pill}>
        <View
          style={[styles.dot, { backgroundColor: colors.occupied }]}
        />
        <Text style={styles.label}>Occupied:</Text>
        <Text style={[styles.value, { color: colors.occupied }]}>
          {group.occupied}
        </Text>
      </View>
      <Text style={styles.total}>{group.total} seats</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
  },
  total: {
    marginLeft: 'auto',
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '600',
  },
});
