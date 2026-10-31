import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';
import type { GroupSummary } from '../types';

type Props = {
  groups: GroupSummary[];
  selected: string;
  onSelect: (group: string) => void;
};

function shortLabel(group: GroupSummary): string {
  return group.key === 'G' ? 'Ground' : `Floor ${group.key}`;
}

export function GroupSelector({ groups, selected, onSelect }: Props) {
  if (groups.length <= 1) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      {groups.map((group) => {
        const active = group.key === selected;
        return (
          <Pressable
            key={group.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(group.key)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {shortLabel(group)}
            </Text>
            <Text style={[styles.count, active && styles.countActive]}>
              {group.available}/{group.total}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    flexGrow: 0,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 92,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.white,
  },
  count: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  countActive: {
    color: '#cbd5e1',
  },
  pressed: {
    opacity: 0.75,
  },
});
