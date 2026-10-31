import { z } from 'zod';
import { readJsonFile, writeJsonFile } from './storage.js';
import type { PollSnapshot } from './types.js';

const pollSnapshotSchema = z.object({
  seats: z.record(z.string(), z.boolean()),
  fetchedAt: z.number(),
});

export interface StateRepository {
  load(): Promise<PollSnapshot | null>;
  save(snapshot: PollSnapshot): Promise<void>;
}

export class StateStore implements StateRepository {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<PollSnapshot | null> {
    let raw: unknown;
    try {
      raw = await readJsonFile<unknown>(this.filePath);
    } catch (error) {
      console.error('Could not read poll state:', error);
      return null;
    }

    if (!raw) {
      return null;
    }

    const parsed = pollSnapshotSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Poll state file is invalid; ignoring it.');
      return null;
    }

    return parsed.data;
  }

  save(snapshot: PollSnapshot): Promise<void> {
    this.writeChain = this.writeChain
      .then(() => writeJsonFile(this.filePath, snapshot))
      .catch((error) => {
        console.error('Could not persist poll state:', error);
      });
    return this.writeChain;
  }
}
