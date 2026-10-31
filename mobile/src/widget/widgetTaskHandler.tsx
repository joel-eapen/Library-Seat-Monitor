import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { fetchSeatSnapshot } from '../api/seatApi';
import { config } from '../config';
import { loadSnapshot, saveSnapshot } from '../storage/snapshotStorage';
import { SeatWidget } from './SeatWidget';
import { toWidgetProps } from './widgetData';

const WIDGET_NAME = 'SeatWidget';

export async function widgetTaskHandler(
  props: WidgetTaskHandlerProps
): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) {
    return;
  }

  if (props.widgetAction === 'WIDGET_DELETED') {
    return;
  }

  const cached = await loadSnapshot();

  if (props.widgetAction === 'WIDGET_CLICK') {
    if (props.clickAction !== 'REFRESH') {
      return;
    }
  } else if (cached) {
    props.renderWidget(
      <SeatWidget {...toWidgetProps(cached, { stale: true })} />
    );
  }

  if (props.widgetAction === 'WIDGET_RESIZED' && cached) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.requestTimeoutMs
  );

  try {
    const snapshot = await fetchSeatSnapshot(
      controller.signal,
      config.seatApiUrl
    );
    await saveSnapshot(snapshot);
    props.renderWidget(<SeatWidget {...toWidgetProps(snapshot)} />);
  } catch {
    if (cached) {
      props.renderWidget(
        <SeatWidget {...toWidgetProps(cached, { stale: true })} />
      );
      return;
    }
    props.renderWidget(
      <SeatWidget
        {...toWidgetProps(null, { stale: true, empty: true })}
      />
    );
  } finally {
    clearTimeout(timeout);
  }
}
