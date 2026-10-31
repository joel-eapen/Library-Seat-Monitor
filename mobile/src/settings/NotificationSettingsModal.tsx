import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_FLOORS } from '../config';
import { groupLabel } from '../lib/seatUtils';
import { colors, spacing } from '../theme';
import type { NotificationSettings, PushStatus } from '../types';

type Props = {
  visible: boolean;
  settings: NotificationSettings;
  pushStatus: PushStatus;
  relayConfigured: boolean;
  onClose: () => void;
  onChange: (settings: NotificationSettings) => void;
  onTest: () => void;
};

const STATUS_TEXT: Record<PushStatus, string> = {
  disabled: 'Alerts are off.',
  idle: 'Enable alerts to register this device.',
  registering: 'Registering this device with the push relay…',
  registered: 'This device is registered for push alerts.',
  error: 'Could not register with the push relay.',
};

export function NotificationSettingsModal({
  visible,
  settings,
  pushStatus,
  relayConfigured,
  onClose,
  onChange,
  onTest,
}: Props) {
  const toggleFloor = (floor: string) => {
    const active = settings.floors.includes(floor);
    if (active && settings.floors.length === 1) {
      return;
    }
    const floors = active
      ? settings.floors.filter((item) => item !== floor)
      : [...settings.floors, floor];
    onChange({ ...settings, floors });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Alerts</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close settings"
              onPress={onClose}
              style={styles.close}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Notify me when a seat frees up</Text>
                <Text style={styles.rowSubtitle}>
                  Push alerts work even when the app is closed.
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(enabled) =>
                  onChange({ ...settings, enabled })
                }
                trackColor={{
                  false: colors.border,
                  true: colors.available,
                }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.statusBox}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      pushStatus === 'registered'
                        ? colors.available
                        : pushStatus === 'error'
                          ? colors.occupied
                          : colors.warning,
                  },
                ]}
              />
              <View style={styles.statusTextWrap}>
                <Text style={styles.statusText}>
                  {STATUS_TEXT[pushStatus]}
                </Text>
                {!relayConfigured ? (
                  <Text style={styles.statusHint}>
                    Set EXPO_PUBLIC_PUSH_RELAY_URL to enable push alerts.
                  </Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Floors to watch</Text>
            <Text style={styles.sectionHint}>
              You will only be notified for the selected floors.
            </Text>
            <View style={styles.floorGrid}>
              {ALL_FLOORS.map((floor) => {
                const active = settings.floors.includes(floor);
                return (
                  <Pressable
                    key={floor}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    onPress={() => toggleFloor(floor)}
                    style={[
                      styles.floorChip,
                      active && styles.floorChipActive,
                    ]}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={active ? colors.available : colors.subtle}
                    />
                    <Text
                      style={[
                        styles.floorLabel,
                        active && styles.floorLabelActive,
                      ]}
                    >
                      {groupLabel(floor).replace(' Floor', '')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onTest}
              disabled={!settings.enabled}
              style={({ pressed }) => [
                styles.testButton,
                !settings.enabled && styles.testButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={settings.enabled ? colors.accent : colors.subtle}
              />
              <Text
                style={[
                  styles.testButtonText,
                  !settings.enabled && styles.testButtonTextDisabled,
                ]}
              >
                Send test notification
              </Text>
            </Pressable>

            <View style={styles.widgetBox}>
              <Text style={styles.sectionTitle}>Home screen widget</Text>
              <Text style={styles.sectionHint}>
                Long-press your home screen, choose Widgets, and select
                “Library Seats”. The widget refreshes every 30 minutes or when
                you tap Refresh.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusText: {
    color: colors.muted,
    fontSize: 11,
  },
  statusHint: {
    color: colors.warning,
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xl,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  floorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  floorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  floorChipActive: {
    borderColor: colors.availableBorder,
    backgroundColor: colors.availableBg,
  },
  floorLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  floorLabelActive: {
    color: colors.available,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.md,
  },
  testButtonDisabled: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  testButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  testButtonTextDisabled: {
    color: colors.subtle,
  },
  widgetBox: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
