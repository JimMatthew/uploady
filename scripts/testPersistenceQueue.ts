import {
  TransferPersistenceQueue,
  type TransferPersistenceEvent,
} from "../services/transferPersistenceQueue";

const startedAt = Date.now();

function log(source: string, message: string): void {
  const elapsed = Date.now() - startedAt;

  console.log(
    `${elapsed.toString().padStart(5)}ms | ${source.padEnd(10)} | ${message}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ---------------------------------------------------------------------------
// Test Configuration
// ---------------------------------------------------------------------------

const FILE_COUNT = 50;
const PRODUCER_DELAY_MS = 10;
const DATABASE_DELAY_MS = 150;

// ---------------------------------------------------------------------------
// Test State
// ---------------------------------------------------------------------------

let producedEvents = 0;
let persistedEvents = 0;
let batchCount = 0;

const persistedEventKeys = new Set<string>();

// ---------------------------------------------------------------------------
// Fake Persistence Layer
// ---------------------------------------------------------------------------

/**
 * Simulates a slow asynchronous persistence layer.
 *
 * While this handler is waiting, producers continue enqueueing events.
 * Those events should accumulate in the queue and become the next batch.
 */
async function persistBatch(
  events: TransferPersistenceEvent[],
): Promise<void> {
  batchCount++;

  const currentBatch = batchCount;

  log(
    "DATABASE",
    `START batch=${currentBatch} events=${events.length}`,
  );

  await sleep(DATABASE_DELAY_MS);

  for (const event of events) {
    const key = `${event.type}:${event.itemId}`;

    if (persistedEventKeys.has(key)) {
      throw new Error(`Duplicate persistence event: ${key}`);
    }

    persistedEventKeys.add(key);
    persistedEvents++;
  }

  log(
    "DATABASE",
    `DONE  batch=${currentBatch} events=${events.length} total=${persistedEvents}`,
  );
}

const persistenceQueue = new TransferPersistenceQueue(persistBatch);

// ---------------------------------------------------------------------------
// Event Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Producer
// ---------------------------------------------------------------------------

/**
 * Produces transfer events faster than the fake database can persist them.
 *
 * Each file produces two events:
 *
 *   file_started
 *   file_completed
 *
 * Because persistence takes much longer than the delay between files, events
 * should accumulate while a batch is being handled.
 */
async function produceTransfers(): Promise<void> {
  for (let i = 1; i <= FILE_COUNT; i++) {
    enqueueStarted(i);
    enqueueCompleted(i);

    if (i % 10 === 0) {
      log(
        "TRANSFER",
        `produced files=${i} events=${producedEvents}`,
      );
    }

    await sleep(PRODUCER_DELAY_MS);
  }
}

// ---------------------------------------------------------------------------
// Stress Test
// ---------------------------------------------------------------------------

log(
  "MAIN",
  `starting stress test files=${FILE_COUNT} expectedEvents=${FILE_COUNT * 2}`,
);

await produceTransfers();

log(
  "TRANSFER",
  `producer finished events=${producedEvents}`,
);

/*
 * The producer is finished, but persistence may still be processing a batch
 * or have additional events waiting in the queue.
 *
 * flush() must not resolve until every produced event is durable.
 */
log("MAIN", "calling flush()");

await persistenceQueue.flush();

log("MAIN", "flush resolved");

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const expectedEvents = FILE_COUNT * 2;

console.log();
console.log("--------------------------------------------------");
console.log("Stress Test Results");
console.log("--------------------------------------------------");
console.log(`Files:             ${FILE_COUNT}`);
console.log(`Expected events:   ${expectedEvents}`);
console.log(`Produced events:   ${producedEvents}`);
console.log(`Persisted events:  ${persistedEvents}`);
console.log(`Unique events:     ${persistedEventKeys.size}`);
console.log(`Database batches:  ${batchCount}`);
console.log("--------------------------------------------------");

if (producedEvents !== expectedEvents) {
  throw new Error(
    `Expected ${expectedEvents} produced events, got ${producedEvents}`,
  );
}

if (persistedEvents !== expectedEvents) {
  throw new Error(
    `Expected ${expectedEvents} persisted events, got ${persistedEvents}`,
  );
}

if (persistedEventKeys.size !== expectedEvents) {
  throw new Error(
    `Expected ${expectedEvents} unique events, got ${persistedEventKeys.size}`,
  );
}

if (batchCount >= expectedEvents) {
  throw new Error(
    `Expected batching to occur, but got ${batchCount} batches for ${expectedEvents} events`,
  );
}

log(
  "MAIN",
  `PASS - ${expectedEvents} events persisted exactly once across ${batchCount} batches`,
);