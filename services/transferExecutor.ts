const { EventEmitter } = require("node:events");

const {
  transferJobs,
  transferItems,
}: {
  transferJobs: TransferJobStore;
  transferItems: TransferItemStore;
} = require("../db");

const { JobStatus, ItemStatus } = require("../controllers/jobs/jobConstants");
const { expandJobItems } = require("./transferExpansionService");

import type { JobStatus as JobStatusType } from "../controllers/jobs/jobConstants";
import { TransferItemStore } from "../db/stores/transferItemStore";
import { TransferJobStore } from "../db/stores/transferJobStore";

import type {
  InMemoryTransferItem,
  InMemoryTransferJob,
  TransferExecutionCallbacks,
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

    const items = new Map<string, InMemoryTransferItem>(
      itemDocs.map((doc) => [
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

    const roots = new Map<string, TransferRoot>();

    for (const item of items.values()) {
      let root = roots.get(item.rootItem);

      if (!root) {
        root = {
          rootItem: item.rootItem,
          totalFiles: 0,
          completedFiles: 0,
          failedFiles: 0,
          percent: 0,
          error: null,
        };

        roots.set(item.rootItem, root);
      }

      root.totalFiles++;
    }

    const job: InMemoryTransferJob = {
      jobId,
      status: JobStatus.RUNNING,
      destServerId: jobDoc.destServerId,
      destPath: jobDoc.destPath,
      totalFiles: items.size,
      completedFiles: 0,
      failedFiles: 0,
      currentFile: null,
      stopRequested: false,
      roots,
      items,
    };

    this.activeJobs.set(jobId, job);

    await transferJobs.markRunning(jobId, items.size);

    this.emit(`jobStart:${jobId}`, {
      roots: [...job.roots.values()],
    });

    // -----------------------------------------------------------------------
    // Phase 3: execute
    // -----------------------------------------------------------------------

    try {
      await this.executeJob(job);
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

    const finalStatus: JobStatusType = job.stopRequested
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

  private async executeJob(job: InMemoryTransferJob): Promise<void> {
    /*
     * Kept as a runtime require for now because sftpService currently
     * participates in the transfer implementation. We can remove this
     * once that module is converted and its dependency direction is clear.
     */
    const { executeTransferJob } = require("./sftpService") as {
      executeTransferJob(
        job: InMemoryTransferJob,
        callbacks: TransferExecutionCallbacks,
      ): Promise<void>;
    };

    await executeTransferJob(job, {
      shouldStop: () => job.stopRequested,

      // -------------------------------------------------------------------
      // File Start
      // -------------------------------------------------------------------

      onFileStart: async (item) => {
        item.status = ItemStatus.IN_PROGRESS;

        job.currentFile = item.filename;

        await Promise.all([
          transferItems.markStarted(item.itemId),
          transferJobs.setCurrentFile(job.jobId, item.filename),
        ]);

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

      onFileDone: async (item) => {
        item.status = ItemStatus.COMPLETED;

        item.percent = 100;

        job.completedFiles++;

        const root = job.roots.get(item.rootItem);

        if (!root) {
          throw new Error(`Missing transfer root: ${item.rootItem}`);
        }

        root.completedFiles++;

        await Promise.all([
          transferItems.markCompleted(item.itemId, item.size),
          transferJobs.incrementCompleted(job.jobId, item.size),
        ]);

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

        await Promise.all([
          transferItems.markFailed(item.itemId, err.message),
          transferJobs.incrementFailed(job.jobId),
        ]);

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

const transferExecutor = new TransferExecutor();

export = transferExecutor;
