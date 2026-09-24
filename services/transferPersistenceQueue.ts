/**
 * Buffers transfer persistence events and persists the currently available
 * backlog as a batch.
 *
 * During transfer execution, in-memory state is authoritative. Persistence
 * follows asynchronously through this queue. `flush()` is the durability
 * barrier used before final job completion.
 *
 * See: docs/transfer-persistence.md
 */

import { logger } from "../logging";
const log = logger.child("TRANSFER");

export type TransferPersistenceEvent =
  | {
      type: "file_started";
      jobId: string;
      itemId: string;
      filename: string;
      startedAt: Date;
    }
  | {
      type: "file_completed";
      jobId: string;
      itemId: string;
      size: number;
      completedAt: Date;
    }
  | {
      type: "file_failed";
      jobId: string;
      itemId: string;
      error: string;
      failedAt: Date;
    };

export type TransferPersistenceHandler = (
  events: TransferPersistenceEvent[],
) => Promise<void>;

export class TransferPersistenceQueue {
  private readonly queue: TransferPersistenceEvent[] = [];
  private readonly handler: TransferPersistenceHandler;

  private processing = false;
  private scheduled = false;

  private flushWaiters: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  private failure: Error | null = null;

  constructor(handler: TransferPersistenceHandler) {
    this.handler = handler;
  }

  /**
   * Adds a persistence event to the queue and schedules processing.
   *
   * Execution does not wait for the event to be persisted.
   */
  enqueue(event: TransferPersistenceEvent): void {
    if (this.failure) {
      throw this.failure;
    }

    this.queue.push(event);
    this.schedule();
  }

  /**
   * Waits until all queued persistence work has completed.
   *
   * Used as a durability barrier before a transfer job is finalized. If
   * persistence has failed, the failure is propagated to the caller.
   */
  flush(): Promise<void> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }

    if (!this.processing && !this.scheduled && this.queue.length === 0) {
      log.info("[TransferPersistence] flush immediate");
      return Promise.resolve();
    }

    const flushStartedAt = performance.now();
    log.info("Persistence flush waiting", {
      queued: this.queue.length,
      processing: this.processing,
      scheduled: this.scheduled,
    })
   
    return new Promise<void>((resolve, reject) => {
      this.flushWaiters.push({
        resolve: () => {
          log.info("Persistence flush complete", {
            duration: (performance.now() - flushStartedAt).toFixed(2)
          })
          
          resolve();
        },
        reject,
      });
    });
  }

  /**
   * Schedules queue processing for the next event-loop turn.
   *
   * Multiple enqueues before processing begins share the same scheduled run.
   */
  private schedule(): void {
    if (this.processing || this.scheduled) {
      return;
    }

    this.scheduled = true;

    setImmediate(() => {
      this.scheduled = false;
      void this.process();
    });
  }

  /**
   * Persists queued events in batches until the queue is empty.
   *
   * Each batch contains every event currently waiting. Events that arrive
   * while a batch is being persisted accumulate for the next batch.
   */
  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.queue.length);

        const batchStartedAt = performance.now();
        const startedAt = new Date();

        log.info("Persistence batch start", {
          events: batch.length,
          queued: this.queue.length,
          time: startedAt.toISOString()
        })
       
        await this.handler(batch);

        const durationMs = performance.now() - batchStartedAt;

        log.info("Persistence batch done", {
          events: batch.length,
          duration: durationMs.toFixed(2),
          queued: this.queue.length
        })
      }

      this.resolveFlushWaiters();
    } catch (error) {
      const failure =
        error instanceof Error
          ? error
          : new Error("Transfer persistence failed");

      this.failure = failure;
      this.rejectFlushWaiters(failure);
    } finally {
      this.processing = false;

      if (this.queue.length > 0 && !this.failure) {
        this.schedule();
      }
    }
  }

  /**
   * Resolves all callers currently waiting for the queue to flush.
   */
  private resolveFlushWaiters(): void {
    const waiters = this.flushWaiters;
    this.flushWaiters = [];

    for (const waiter of waiters) {
      waiter.resolve();
    }
  }

  /**
   * Rejects all pending flush callers when persistence fails.
   */
  private rejectFlushWaiters(error: Error): void {
    const waiters = this.flushWaiters;
    this.flushWaiters = [];

    for (const waiter of waiters) {
      waiter.reject(error);
    }
  }
}
