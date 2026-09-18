import { EventEmitter } from "node:events";
import { transferJobs, transferItems } from "../db";
import { TransferPersistenceQueue } from "./transferPersistenceQueue";
import { TransferPersistenceService } from "./transferPersistenceService";
import { JobStatus, ItemStatus } from "../controllers/jobs/jobConstants";

import { expandJobItems } from "./transferExpansionService";
import { executeTransferJob } from "./transferExecutionService";

import type {
  InMemoryTransferItem,
  InMemoryTransferJob,
  TransferRoot,
} from "../types/transferTypes";

// ---------------------------------------------------------------------------
// Transfer Executor
// ---------------------------------------------------------------------------

class TransferExecutor extends EventEmitter {
  private readonly queue: string[] = [];

  private readonly activeJobs = new Map<string, InMemoryTransferJob>();

  private readonly MAX_CONCURRENT = 1;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Adds a job to the FIFO queue and attempts to start processing.
   */
  enqueue(jobId: string): void {
    this.queue.push(jobId);
    this.processQueue();
  }

  /**
   * Returns the live in-memory state for a running job.
   */
  getJob(jobId: string): InMemoryTransferJob | null {
    return this.activeJobs.get(jobId) ?? null;
  }

  /**
   * Returns all currently-active jobs.
   */
  listActive(): InMemoryTransferJob[] {
    return [...this.activeJobs.values()];
  }

  /**
   * Requests cooperative cancellation of a running job.
   *
   * The currently-running file is not interrupted.
   * Cancellation takes effect between file transfers.
   */
  stopJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);

    if (job) {
      job.stopRequested = true;
    }
  }

  // -------------------------------------------------------------------------
  // Queue Processing
  // -------------------------------------------------------------------------

  private processQueue(): void {
    while (
      this.activeJobs.size < this.MAX_CONCURRENT &&
      this.queue.length > 0
    ) {
      const jobId = this.queue.shift();

      if (!jobId) {
        return;
      }

      void this.runJob(jobId).catch((err: unknown) => {
        console.error(`Executor: unhandled error in job ${jobId}:`, err);
      });
    }
  }

  // -------------------------------------------------------------------------
  // Job Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Runs the complete lifecycle for one transfer job:
   *
   * expand -> load -> execute -> finalize
   */
  private async runJob(jobId: string): Promise<void> {
    // -----------------------------------------------------------------------
    // Phase 1: expand directories into file items
    // -----------------------------------------------------------------------

    await transferJobs.markExpanding(jobId);

    try {
      await expandJobItems(jobId);
    } catch (err) {
      const message = getErrorMessage(err);

      console.error(`Executor: expansion failed for job ${jobId}:`, err);

      await transferJobs.markFailed(jobId, `Expansion failed: ${message}`);

      this.processQueue();
      return;
    }

    // -----------------------------------------------------------------------
    // Phase 2: load expanded items from DB into memory
    // -----------------------------------------------------------------------

    const [jobDoc, itemDocs] = await Promise.all([
      transferJobs.findById(jobId),
      transferItems.findFilesByJobId(jobId),
    ]);

    if (!jobDoc) {
      console.error(`Executor: job ${jobId} not found after expansion`);

      this.processQueue();
      return;
    }

    /*
     * Expansion may already have placed some items into a terminal FAILED
     * state. Those items remain part of the job history/accounting, but they
     * must not be executed again.
     */
    const executableDocs = itemDocs.filter(
      (item) => item.status === ItemStatus.PENDING,
    );

    const expansionFailedDocs = itemDocs.filter(
      (item) => item.status === ItemStatus.FAILED,
    );

    /*
     * The execution map contains only items that are actually eligible to run.
     */
    const items = new Map<string, InMemoryTransferItem>(
      executableDocs.map((doc) => [
        doc._id,
        {
          itemId: doc._id,
          filename: doc.filename,
          rootItem: doc.rootItem,
          sourceServerId: doc.sourceServerId,
          sourcePath: requireString(
            doc.sourcePath,
            `Missing sourcePath for transfer item ${doc._id}`,
          ),
          destinationPath: requireString(
            doc.destinationPath,
            `Missing destinationPath for transfer item ${doc._id}`,
          ),

          sourceType: doc.sourceType,
          ...(doc.archivePath
            ? {
                archivePath: doc.archivePath,
              }
            : {}),
          size: doc.size,
          status: doc.status,
          percent: 0,
          error: null,
        },
      ]),
    );

    /*
     * Roots are built from every concrete file produced by expansion, not
     * just the executable files. This preserves failures discovered during
     * expansion in the root totals and failure counts.
     */
    const roots = new Map<string, TransferRoot>();

    for (const doc of itemDocs) {
      let root = roots.get(doc.rootItem);

      if (!root) {
        root = {
          rootItem: doc.rootItem,
          totalFiles: 0,
          completedFiles: 0,
          failedFiles: 0,
          percent: 0,
          error: null,
        };

        roots.set(doc.rootItem, root);
      }

      root.totalFiles++;

      if (doc.status === ItemStatus.FAILED) {
        root.failedFiles++;

        if (doc.error) {
          root.error = doc.error;
        }
      }
    }

    const expansionFailedFiles = expansionFailedDocs.length;

    /*
     * Expansion owns totalFiles/totalBytes. At this point jobDoc contains the
     * canonical totals persisted by expansion.
     *
     * Execution owns the live counters from here forward. Failures already
     * discovered during expansion become the initial failed count.
     */
    const job: InMemoryTransferJob = {
      jobId,
      status: JobStatus.RUNNING,
      destServerId: jobDoc.destServerId,
      destPath: jobDoc.destPath,
      totalFiles: jobDoc.totalFiles,
      completedFiles: 0,
      failedFiles: expansionFailedFiles,
      currentFile: null,
      stopRequested: false,
      roots,
      items,
    };

    this.activeJobs.set(jobId, job);

    /*
     * Do not replace totalFiles here with items.size.
     *
     * items.size is only the number of executable files. Expansion has already
     * calculated and persisted the canonical job total.
     */
    await transferJobs.markRunning(jobId);

    const persistenceService = new TransferPersistenceService(
      transferItems,
      transferJobs,
    );

    const persistenceQueue = new TransferPersistenceQueue(
      persistenceService.handle,
    );

    this.emit(`jobStart:${jobId}`, {
      roots: [...job.roots.values()],
    });

    // -----------------------------------------------------------------------
    // Phase 3: execute
    // -----------------------------------------------------------------------

    try {
      await this.executeJob(job, persistenceQueue);
      await persistenceQueue.flush();
    } catch (err) {
      const message = getErrorMessage(err);

      console.error(`Executor: job ${jobId} failed:`, err);

      await transferJobs.markFailed(jobId, message);

      this.emit(`jobDone:${jobId}`, {
        completed: job.completedFiles,
        failed: job.failedFiles,
        status: JobStatus.FAILED,
      });

      this.activeJobs.delete(jobId);

      this.processQueue();
      return;
    }

    // -----------------------------------------------------------------------
    // Phase 4: finalize
    // -----------------------------------------------------------------------

    const finalStatus: JobStatus = job.stopRequested
      ? JobStatus.CANCELLED
      : job.failedFiles > 0 && job.completedFiles === 0
        ? JobStatus.FAILED
        : JobStatus.COMPLETED;

    await transferJobs.finish(jobId, finalStatus);

    this.emit(`jobDone:${jobId}`, {
      completed: job.completedFiles,
      failed: job.failedFiles,
      status: finalStatus,
    });

    this.activeJobs.delete(jobId);

    this.processQueue();
  }

  // -------------------------------------------------------------------------
  // Execution Loop
  // -------------------------------------------------------------------------

  private async executeJob(
    job: InMemoryTransferJob,
    persistenceQueue: TransferPersistenceQueue,
  ): Promise<void> {
    /*
     * Kept as a runtime require for now because sftpService currently
     * participates in the transfer implementation. We can remove this
     * once that module is converted and its dependency direction is clear.
     */

    await executeTransferJob(job, {
      shouldStop: () => job.stopRequested,

      // -------------------------------------------------------------------
      // File Start
      // -------------------------------------------------------------------

      onFileStart: (item) => {
        item.status = ItemStatus.IN_PROGRESS;

        job.currentFile = item.filename;

        persistenceQueue.enqueue({
          type: "file_started",
          jobId: job.jobId,
          itemId: item.itemId,
          filename: item.filename,
          startedAt: new Date(),
        });

        this.emit(`fileStart:${job.jobId}`, {
          file: item.filename,
          rootItem: item.rootItem,
          size: item.size,
        });
      },

      // -------------------------------------------------------------------
      // File Progress
      // -------------------------------------------------------------------

      onFileProgress: (item, percent) => {
        item.percent = percent;

        const root = job.roots.get(item.rootItem);

        if (!root) {
          throw new Error(`Missing transfer root: ${item.rootItem}`);
        }

        if (root.totalFiles === 1) {
          root.percent = percent;

          this.emit(`rootProgress:${job.jobId}`, {
            ...root,
          });
        }
      },

      // -------------------------------------------------------------------
      // File Completed
      // -------------------------------------------------------------------

      onFileDone: (item) => {
        item.status = ItemStatus.COMPLETED;

        item.percent = 100;

        job.completedFiles++;

        const root = job.roots.get(item.rootItem);

        if (!root) {
          throw new Error(`Missing transfer root: ${item.rootItem}`);
        }

        root.completedFiles++;

        persistenceQueue.enqueue({
          type: "file_completed",
          jobId: job.jobId,
          itemId: item.itemId,
          size: item.size,
          completedAt: new Date(),
        });

        this.emit(`rootProgress:${job.jobId}`, {
          ...root,
        });
      },

      // -------------------------------------------------------------------
      // File Failed
      // -------------------------------------------------------------------

      onFileFail: async (item, err) => {
        item.status = ItemStatus.FAILED;

        item.error = err.message;

        job.failedFiles++;

        const root = job.roots.get(item.rootItem);

        if (!root) {
          throw new Error(`Missing transfer root: ${item.rootItem}`);
        }

        root.failedFiles++;
        root.error = err.message;

        persistenceQueue.enqueue({
          type: "file_failed",
          jobId: job.jobId,
          itemId: item.itemId,
          error: err.message,
          failedAt: new Date(),
        });

        this.emit(`rootProgress:${job.jobId}`, {
          ...root,
        });
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function requireString(value: string | undefined, message: string): string {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const transferExecutor = new TransferExecutor();
