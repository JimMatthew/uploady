import { expect, test } from "bun:test";

import {
  TransferPersistenceQueue,
  type TransferPersistenceEvent,
} from "../services/transferPersistenceQueue";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test("persists concurrently produced events exactly once in batches", async () => {
  const FILE_COUNT = 50;
  const PRODUCER_DELAY_MS = 10;
  const DATABASE_DELAY_MS = 150;

  let producedEvents = 0;
  let persistedEvents = 0;
  let batchCount = 0;

  const persistedEventKeys = new Set<string>();

  async function persistBatch(
    events: TransferPersistenceEvent[],
  ): Promise<void> {
    batchCount++;

    await sleep(DATABASE_DELAY_MS);

    for (const event of events) {
      const key = `${event.type}:${event.itemId}`;

      expect(persistedEventKeys.has(key)).toBe(false);

      persistedEventKeys.add(key);
      persistedEvents++;
    }
  }

  const persistenceQueue = new TransferPersistenceQueue(persistBatch);

  function enqueue(event: TransferPersistenceEvent): void {
    producedEvents++;
    persistenceQueue.enqueue(event);
  }

  function enqueueStarted(index: number): void {
    enqueue({
      type: "file_started",
      jobId: "stress-job",
      itemId: `file-${index}`,
      filename: `file-${index}.bin`,
      startedAt: new Date(),
    });
  }

  function enqueueCompleted(index: number): void {
    enqueue({
      type: "file_completed",
      jobId: "stress-job",
      itemId: `file-${index}`,
      size: index * 1000,
      completedAt: new Date(),
    });
  }

  async function produceTransfers(): Promise<void> {
    for (let i = 1; i <= FILE_COUNT; i++) {
      enqueueStarted(i);
      enqueueCompleted(i);

      await sleep(PRODUCER_DELAY_MS);
    }
  }

  await produceTransfers();
  await persistenceQueue.flush();

  const expectedEvents = FILE_COUNT * 2;

  expect(producedEvents).toBe(expectedEvents);
  expect(persistedEvents).toBe(expectedEvents);
  expect(persistedEventKeys.size).toBe(expectedEvents);

  // The slow persistence handler should cause multiple events to be
  // accumulated into batches rather than persisted individually.
  expect(batchCount).toBeLessThan(expectedEvents);
});