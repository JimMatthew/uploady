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

  enqueue(event: TransferPersistenceEvent): void {
    if (this.failure) {
      throw this.failure;
    }

    this.queue.push(event);
    this.schedule();
  }

  flush(): Promise<void> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }

    if (!this.processing && !this.scheduled && this.queue.length === 0) {
      console.log("[TransferPersistence] flush immediate");
      return Promise.resolve();
    }

    const flushStartedAt = performance.now();

    console.log(
      `[TransferPersistence] flush waiting` +
        ` queued=${this.queue.length}` +
        ` processing=${this.processing}` +
        ` scheduled=${this.scheduled}`,
    );

    return new Promise<void>((resolve, reject) => {
      this.flushWaiters.push({
        resolve: () => {
          console.log(
            `[TransferPersistence] flush complete` +
              ` duration=${(performance.now() - flushStartedAt).toFixed(2)}ms`,
          );

          resolve();
        },
        reject,
      });
    });
  }

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
        console.log(
          `[TransferPersistence] batch start` +
            ` events=${batch.length}` +
            ` queued=${this.queue.length}` +
            ` time=${startedAt.toISOString()}`,
        );

        await this.handler(batch);

        const durationMs = performance.now() - batchStartedAt;

        console.log(
          `[TransferPersistence] batch done` +
            ` events=${batch.length}` +
            ` duration=${durationMs.toFixed(2)}ms` +
            ` queued=${this.queue.length}`,
        );
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

  private resolveFlushWaiters(): void {
    const waiters = this.flushWaiters;
    this.flushWaiters = [];

    for (const waiter of waiters) {
      waiter.resolve();
    }
  }

  private rejectFlushWaiters(error: Error): void {
    const waiters = this.flushWaiters;
    this.flushWaiters = [];

    for (const waiter of waiters) {
      waiter.reject(error);
    }
  }
}
