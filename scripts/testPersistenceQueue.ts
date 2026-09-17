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

/**
 * Deliberately blocks the JavaScript thread.
 *
 * This simulates something like synchronous SQLite work.
 */
function synchronousDatabaseWrite(ms: number): void {
  const end = Date.now() + ms;

  while (Date.now() < end) {
    // Intentionally block.
  }
}

/**
 * This is our fake persistence layer.
 *
 * In the real application this handler will translate persistence
 * events into writes to the transfer item/job stores.
 */
async function persistEvent(
  event: TransferPersistenceEvent,
): Promise<void> {
  log(
    "DATABASE",
    `START write: ${event.type} / ${event.itemId}`,
  );

  // Simulate a slow synchronous SQLite write.
  synchronousDatabaseWrite(300);

  log(
    "DATABASE",
    `DONE  write: ${event.type} / ${event.itemId}`,
  );
}

const persistenceQueue = new TransferPersistenceQueue(persistEvent);

/*
 * This represents unrelated event-loop work.
 *
 * If the queue really yields between persistence events,
 * these callbacks should get opportunities to execute
 * between database writes.
 */
let heartbeat = 0;

const heartbeatTimer = setInterval(() => {
  heartbeat++;

  log(
    "EVENT LOOP",
    `heartbeat ${heartbeat}`,
  );
}, 100);

/*
 * Simulate the transfer executor producing persistence events.
 */

log("TRANSFER", "file A started");

persistenceQueue.enqueue({
  type: "file_started",
  jobId: "job-1",
  itemId: "A",
  filename: "a.iso",
  startedAt: new Date(),
});

log("TRANSFER", "enqueue returned for A started");

log("TRANSFER", "file A completed");

persistenceQueue.enqueue({
  type: "file_completed",
  jobId: "job-1",
  itemId: "A",
  size: 1_000_000,
  completedAt: new Date(),
});

log("TRANSFER", "enqueue returned for A completed");

log("TRANSFER", "file B started");

persistenceQueue.enqueue({
  type: "file_started",
  jobId: "job-1",
  itemId: "B",
  filename: "b.iso",
  startedAt: new Date(),
});

log("TRANSFER", "enqueue returned for B started");

log("TRANSFER", "file B failed");

persistenceQueue.enqueue({
  type: "file_failed",
  jobId: "job-1",
  itemId: "B",
  error: "Simulated SFTP failure",
  failedAt: new Date(),
});

log("TRANSFER", "enqueue returned for B failed");

log(
  "TRANSFER",
  "all events produced; transfer code is still running",
);

/*
 * Schedule another immediate callback.
 *
 * This gives us another obvious piece of event-loop work that
 * should be allowed to run when the persistence queue yields.
 */
setImmediate(() => {
  log(
    "EVENT LOOP",
    "unrelated setImmediate callback ran",
  );
});

/*
 * flush() is the synchronization point.
 *
 * Everything above merely handed facts to the queue.
 * Here we explicitly say:
 *
 * "Do not continue until everything I've queued is durable."
 */
log("MAIN", "calling flush()");

 persistenceQueue.flush();

log(
  "MAIN",
  "flush resolved - all persistence events completed",
);

clearInterval(heartbeatTimer);

log("MAIN", "test finished");