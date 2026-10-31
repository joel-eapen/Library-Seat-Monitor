import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { SeatWidgetProps } from './widgetData';

function formatClock(timestamp: number | null): string {
  if (!timestamp) {
    return '—';
  }
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const COLORS = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  available: '#4ade80',
  occupied: '#f87171',
  accent: '#38bdf8',
} as const;

export function SeatWidget(props: SeatWidgetProps) {
  const {
    total,
    available,
    occupied,
    floors,
    updatedAt,
    stale,
    empty,
  } = props;

  const statusText = empty
    ? 'Open the app to load seats'
    : stale
      ? `Stale · ${formatClock(updatedAt)}`
      : `Updated ${formatClock(updatedAt)}`;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Library seat availability. Tap to open the app."
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text="Library Seats"
          allowFontScaling={false}
          style={{
            color: COLORS.text,
            fontSize: 14,
            fontWeight: '700',
          }}
        />
        <TextWidget
          text={statusText}
          allowFontScaling={false}
          maxLines={1}
          style={{
            color: empty ? COLORS.muted : stale ? COLORS.occupied : COLORS.available,
            fontSize: 10,
          }}
        />
      </FlexWidget>

      {empty ? (
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="No data yet"
            allowFontScaling={false}
            style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}
          />
          <TextWidget
            text="Tap to open the app or refresh"
            allowFontScaling={false}
            style={{ color: COLORS.muted, fontSize: 11 }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              width: 'match_parent',
            }}
          >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <TextWidget
                text={String(available)}
                allowFontScaling={false}
                style={{
                  color: COLORS.available,
                  fontSize: 38,
                  fontWeight: '800',
                  lineHeight: 40,
                }}
              />
              <TextWidget
                text=" available"
                allowFontScaling={false}
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginBottom: 5,
                }}
              />
            </FlexWidget>
            <TextWidget
              text={`${occupied} occupied / ${total}`}
              allowFontScaling={false}
              style={{ color: COLORS.muted, fontSize: 11, marginBottom: 6 }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              flexDirection: 'row',
              width: 'match_parent',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            {floors.map((floor) => (
              <FlexWidget
                key={floor.key}
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLORS.card,
                  borderRadius: 10,
                  paddingVertical: 6,
                  marginHorizontal: 2,
                }}
              >
                <TextWidget
                  text={floor.key === 'G' ? 'Ground' : `Floor ${floor.key}`}
                  allowFontScaling={false}
                  style={{ color: COLORS.muted, fontSize: 9 }}
                />
                <TextWidget
                  text={`${floor.available}/${floor.total}`}
                  allowFontScaling={false}
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                />
              </FlexWidget>
            ))}
          </FlexWidget>
        </FlexWidget>
      )}

      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 8,
        }}
      >
        <FlexWidget
          clickAction="REFRESH"
          accessibilityLabel="Refresh seat availability"
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <TextWidget
            text="Refresh"
            allowFontScaling={false}
            style={{ color: COLORS.accent, fontSize: 11, fontWeight: '700' }}
          />
        </FlexWidget>
        <TextWidget
          text="Tap to open"
          allowFontScaling={false}
          style={{ color: COLORS.muted, fontSize: 10 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
