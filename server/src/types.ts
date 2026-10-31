export type Floor = 'G' | '1' | '2' | '3';

export const FLOORS: readonly Floor[] = ['G', '1', '2', '3'];

export type Seat = {
  id: string;
  floor: string;
  number: number;
  occupied: boolean;
};

export type SeatMap = Record<string, boolean>;

export type Subscription = {
  token: string;
  floors: string[];
  updatedAt: number;
};

export type PollSnapshot = {
  seats: SeatMap;
  fetchedAt: number;
};

export type PollStatus = {
  ok: boolean;
  lastSuccessAt: number | null;
  lastError: string | null;
  seatCount: number | null;
  lastFreedCount: number;
  libraryClosed: boolean;
};

export type PushNotification = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export type PushMessage = PushNotification & {
  token: string;
};

export type PushSendResult = {
  invalidTokens: string[];
};

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushSendResult>;
}
