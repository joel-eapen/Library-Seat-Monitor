export type Seat = {
  id: string;
  group: string;
  number: number;
  occupied: boolean;
};

export type SeatSummary = {
  total: number;
  available: number;
  occupied: number;
};

export type GroupSummary = SeatSummary & {
  key: string;
  label: string;
};

export type SeatSnapshot = {
  seats: Seat[];
  byId: Record<string, Seat>;
  groups: GroupSummary[];
  summary: SeatSummary;
  fetchedAt: number;
};

export type NotificationSettings = {
  enabled: boolean;
  floors: string[];
};

export type LiveStatus = 'loading' | 'live' | 'stale' | 'error';

export type PushStatus =
  | 'disabled'
  | 'idle'
  | 'registering'
  | 'registered'
  | 'error';

export type NotificationPayload = {
  type?: string;
  floor?: string;
  seats?: string;
  count?: string;
};
