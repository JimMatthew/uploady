import type {
  TransferPersistenceEvent,
  TransferPersistenceHandler,
} from "./transferPersistenceQueue";

import type {
  TransferItemPersistenceBatch,
  TransferItemStore,
} from "../db/stores/transferItemStore";

import type {
  TransferJobPersistenceBatch,
  TransferJobStore,
} from "../db/stores/transferJobStore";

export class TransferPersistenceService {
  constructor(
    private readonly transferItems: TransferItemStore,
    private readonly transferJobs: TransferJobStore,
  ) {}

  handle: TransferPersistenceHandler = async (
    events: TransferPersistenceEvent[],
  ): Promise<void> => {
    if (events.length === 0) {
      return;
    }

    const itemBatch: TransferItemPersistenceBatch = {
      started: [],
      completed: [],
      failed: [],
    };

    const jobBatch: TransferJobPersistenceBatch = {
      jobId: events[0].jobId,
      completedFiles: 0,
      transferredBytes: 0,
      failedFiles: 0,
    };

    for (const event of events) {
      if (event.jobId !== jobBatch.jobId) {
        throw new Error(
          "Transfer persistence batch contains events from multiple jobs",
        );
      }

      switch (event.type) {
        case "file_started":
          itemBatch.started.push({
            id: event.itemId,
            startedAt: event.startedAt,
          });

          jobBatch.currentFile = event.filename;
          break;

        case "file_completed":
          itemBatch.completed.push({
            id: event.itemId,
            size: event.size,
            completedAt: event.completedAt,
          });

          jobBatch.completedFiles += 1;
          jobBatch.transferredBytes += event.size;
          break;

        case "file_failed":
          itemBatch.failed.push({
            id: event.itemId,
            error: event.error,
            failedAt: event.failedAt,
          });

          jobBatch.failedFiles += 1;
          break;
      }
    }

    await Promise.all([
      this.transferItems.persistBatch(itemBatch),
      this.transferJobs.persistBatch(jobBatch),
    ]);
  };
}