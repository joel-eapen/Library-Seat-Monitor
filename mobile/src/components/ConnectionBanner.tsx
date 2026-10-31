import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRelativeTime } from '../lib/time';
import { colors, spacing } from '../theme';
import type { LiveStatus } from '../types';

type Props = {
  status: LiveStatus;
  error: string | null;
  lastUpdated: number | null;
  onRetry: () => void;
};

export function ConnectionBanner({
  status,
  error,
  lastUpdated,
  onRetry,
}: Props) {
  if (status === 'live') {
    return null;
  }

  const isError = status === 'error';
  const isStale = status === 'stale';

  return (
    <View
      style={[
        styles.container,
        isError
          ? styles.error
          : isStale
            ? styles.stale
            : styles.loading,
      ]}
    >
      <Ionicons
        name={isError ? 'cloud-offline-outline' : 'sync-outline'}
        size={16}
        color={isError ? colors.occupied : colors.warning}
      />
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {isError
            ? 'Unable to load seats'
            : isStale
              ? 'Connection lost — showing last known data'
              : 'Connecting to the seat feed…'}
        </Text>
        <Text style={styles.subtitle}>
          {error
            ? error
            : lastUpdated
              ? `Updated ${formatRelativeTime(lastUpdated)}`
              : 'Waiting for the first update'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  loading: {
    backgroundColor: colors.accentSoft,
    borderColor: '#bfdbfe',
  },
  stale: {
    backgroundColor: colors.warningSoft,
    borderColor: '#fde68a',
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#fecaca',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  retry: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
