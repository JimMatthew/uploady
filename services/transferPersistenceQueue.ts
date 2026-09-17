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
  event: TransferPersistenceEvent,
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
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.flushWaiters.push({ resolve, reject });
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
        const event = this.queue.shift();

        if (!event) {
          continue;
        }

        await this.handler(event);

        if (this.queue.length > 0) {
          await this.yieldToEventLoop();
        }
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

  private yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => {
      setImmediate(resolve);
    });
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