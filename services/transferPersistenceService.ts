import type {
  TransferPersistenceEvent,
  TransferPersistenceHandler,
} from "./transferPersistenceQueue";

import type { TransferItemStore } from "../db/stores/transferItemStore";
import type { TransferJobStore } from "../db/stores/transferJobStore";

export class TransferPersistenceService {
  constructor(
    private readonly transferItems: TransferItemStore,
    private readonly transferJobs: TransferJobStore,
  ) {}

  handle: TransferPersistenceHandler = async (
    event: TransferPersistenceEvent,
  ): Promise<void> => {
    switch (event.type) {
      case "file_started":
        await Promise.all([
          this.transferItems.markStarted(event.itemId),
          this.transferJobs.setCurrentFile(
            event.jobId,
            event.filename,
          ),
        ]);
        return;

      case "file_completed":
        await Promise.all([
          this.transferItems.markCompleted(
            event.itemId,
            event.size,
          ),
          this.transferJobs.incrementCompleted(
            event.jobId,
            event.size,
          ),
        ]);
        return;

      case "file_failed":
        await Promise.all([
          this.transferItems.markFailed(
            event.itemId,
            event.error,
          ),
          this.transferJobs.incrementFailed(event.jobId),
        ]);
        return;
    }
  };
}