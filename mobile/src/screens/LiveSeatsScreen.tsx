import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { FloorPlan } from '../components/FloorPlan';
import { GroupSelector } from '../components/GroupSelector';
import { Legend } from '../components/Legend';
import { SeatGrid } from '../components/SeatGrid';
import { SummaryBar } from '../components/SummaryBar';
import { useLiveSeats } from '../hooks/useLiveSeats';
import { getFloorMapLayout } from '../lib/floorMaps';
import {
  buildNotificationContent,
  type NotificationContent,
} from '../notifications/notificationMessages';
import {
  detectNewlyAvailable,
  filterSeatsByFloors,
} from '../lib/seatUtils';
import { formatRelativeTime } from '../lib/time';
import { NotificationSettingsModal } from '../settings/NotificationSettingsModal';
import { colors, spacing } from '../theme';
import type {
  NotificationSettings,
  PushStatus,
  SeatSnapshot,
} from '../types';
import { updateSeatWidget } from '../widget/updateSeatWidget';

type Props = {
  settings: NotificationSettings;
  pushStatus: PushStatus;
  relayConfigured: boolean;
  onChangeSettings: (settings: NotificationSettings) => void;
  onTestNotification: () => void;
  focusFloor: string | null;
  focusSeats: string[];
  onFocusConsumed: () => void;
};

export function LiveSeatsScreen({
  settings,
  pushStatus,
  relayConfigured,
  onChangeSettings,
  onTestNotification,
  focusFloor,
  focusSeats,
  onFocusConsumed,
}: Props) {
  const { snapshot, status, error, refresh } = useLiveSeats();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [highlightSeats, setHighlightSeats] = useState<string[]>([]);
  const [banner, setBanner] = useState<NotificationContent | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const previousSnapshotRef = useRef<SeatSnapshot | null>(null);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    if (focusFloor) {
      setSelectedGroup(focusFloor);
      setHighlightSeats(focusSeats);
      onFocusConsumed();
      return;
    }

    if (
      !selectedGroup ||
      !snapshot.groups.some((group) => group.key === selectedGroup)
    ) {
      setSelectedGroup(snapshot.groups[0]?.key ?? null);
    }
  }, [
    snapshot,
    focusFloor,
    focusSeats,
    onFocusConsumed,
    selectedGroup,
  ]);

  useEffect(() => {
    if (highlightSeats.length === 0) {
      return;
    }
    const timeout = setTimeout(() => setHighlightSeats([]), 12000);
    return () => clearTimeout(timeout);
  }, [highlightSeats]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    void updateSeatWidget(snapshot);

    const previous = previousSnapshotRef.current;
    previousSnapshotRef.current = snapshot;

    if (!previous || !settings.enabled) {
      return;
    }

    const isFreshEnough =
      Date.now() - previous.fetchedAt < 30 * 1000;
    if (!isFreshEnough) {
      return;
    }

    const freed = filterSeatsByFloors(
      detectNewlyAvailable(previous, snapshot),
      settings.floors
    );
    if (freed.length === 0) {
      return;
    }

    const content = buildNotificationContent(freed);
    setBanner(content);
    const timeout = setTimeout(() => setBanner(null), 10000);
    return () => clearTimeout(timeout);
  }, [snapshot, settings.enabled, settings.floors]);

  const groups = useMemo(() => snapshot?.groups ?? [], [snapshot?.groups]);
  const selectedSummary = useMemo(
    () => groups.find((group) => group.key === selectedGroup) ?? null,
    [groups, selectedGroup]
  );
  const seats = useMemo(
    () =>
      snapshot?.seats.filter(
        (seat) => seat.group === selectedSummary?.key
      ) ?? [],
    [snapshot, selectedSummary]
  );
  const mapLayout = selectedSummary
    ? getFloorMapLayout(selectedSummary.key)
    : null;

  const handleRefresh = () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 1200);
  };

  const lastUpdated = snapshot?.fetchedAt ?? null;
  const overallAvailable = snapshot?.summary.available;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>NITJ LIBRARY</Text>
          <Text style={styles.title}>Seat availability</Text>
          <Text style={styles.updated}>
            {snapshot
              ? `${overallAvailable} seats free overall · updated ${formatRelativeTime(lastUpdated)}`
              : 'Connecting to the live seat feed'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View
            style={[
              styles.livePill,
              status === 'live'
                ? styles.livePillOn
                : status === 'error'
                  ? styles.livePillError
                  : styles.livePillWarn,
            ]}
          >
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    status === 'live'
                      ? colors.available
                      : status === 'error'
                        ? colors.occupied
                        : colors.warning,
                },
              ]}
            />
            <Text style={styles.liveText}>
              {status === 'live'
                ? 'LIVE'
                : status === 'loading'
                  ? 'SYNC'
                  : 'STALE'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text}
            />
            {settings.enabled ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        </View>
      </View>

      {banner ? (
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.available}
            />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerBody}>{banner.body}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss alert"
            onPress={() => setBanner(null)}
            style={styles.bannerClose}
          >
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      <ConnectionBanner
        status={status}
        error={error}
        lastUpdated={lastUpdated}
        onRetry={refresh}
      />

      {!snapshot ? (
        <View style={styles.center}>
          {status === 'error' ? (
            <>
              <Ionicons
                name="cloud-offline-outline"
                size={42}
                color={colors.occupied}
              />
              <Text style={styles.emptyTitle}>Cannot reach the seat API</Text>
              <Text style={styles.emptyBody}>
                {error ?? 'Check your connection and try again.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={refresh}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.emptyTitle}>Loading seats…</Text>
              <Text style={styles.emptyBody}>
                Fetching the latest snapshot from the library.
              </Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <GroupSelector
            groups={groups}
            selected={selectedSummary?.key ?? ''}
            onSelect={setSelectedGroup}
          />
          {selectedSummary && mapLayout ? (
            <FloorPlan
              group={selectedSummary}
              layout={mapLayout}
              seats={seats}
              highlightSeats={highlightSeats}
            />
          ) : (
            <>
              <SummaryBar group={selectedSummary} />
              <SeatGrid seats={seats} highlightSeats={highlightSeats} />
            </>
          )}
          <Legend />
          <Text style={styles.footer}>
            Seats update every few seconds. Alerts are sent only when a
            previously occupied seat becomes free.
          </Text>
        </ScrollView>
      )}

      <NotificationSettingsModal
        visible={settingsVisible}
        settings={settings}
        pushStatus={pushStatus}
        relayConfigured={relayConfigured}
        onClose={() => setSettingsVisible(false)}
        onChange={onChangeSettings}
        onTest={onTestNotification}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  updated: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
  },
  livePillOn: {
    backgroundColor: colors.availableBg,
    borderColor: colors.availableBorder,
  },
  livePillWarn: {
    backgroundColor: colors.warningSoft,
    borderColor: '#fde68a',
  },
  livePillError: {
    backgroundColor: colors.occupiedBg,
    borderColor: colors.occupiedBorder,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.available,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.availableBorder,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.availableBg,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  bannerBody: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  bannerClose: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.dark,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: colors.subtle,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.75,
  },
});
