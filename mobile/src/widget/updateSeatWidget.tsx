import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { SeatSnapshot } from '../types';
import { SeatWidget } from './SeatWidget';
import { toWidgetProps } from './widgetData';

const WIDGET_NAME = 'SeatWidget';
const MIN_UPDATE_INTERVAL_MS = 60000;

let lastSignature = '';
let lastUpdatedAt = 0;

export async function updateSeatWidget(
  snapshot: SeatSnapshot
): Promise<void> {
  const signature = `${snapshot.summary.available}/${snapshot.summary.occupied}/${snapshot.summary.total}`;
  const now = Date.now();

  if (
    signature === lastSignature &&
    now - lastUpdatedAt < MIN_UPDATE_INTERVAL_MS
  ) {
    return;
  }

  lastSignature = signature;
  lastUpdatedAt = now;

  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (info) => (
        <SeatWidget {...toWidgetProps(snapshot)} width={info.width} />
      ),
      widgetNotFound: () => {
        // No widget is placed on the home screen yet.
      },
    });
  } catch {
    // Widget updates are best-effort and must never affect the main screen.
  }
}
