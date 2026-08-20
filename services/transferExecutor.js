const EventEmitter = require("events");
const TransferJob = require("../models/transferJobs");
const TransferItem = require("../models/TransferItem");
const {
  JobStatus,
  ItemStatus,
  ItemKind,
} = require("../controllers/jobs/jobConstants");
const { connectToSftp } = require("./sftpService");
const { expandJobItems } = require("./transferExpansionService");

// ─── In-Memory Job Shape ───────────────────────────────────────────────────────
//
// activeJobs: Map<jobId string, {
//   jobId:          string,
//   status:         string,
//   destServerId:   string | null,
//   destPath:       string,
//   totalFiles:     number,
//   completedFiles: number,
//   failedFiles:    number,
//   currentFile:    string | null,
//   stopRequested:  boolean,
//   items:          Map<itemId string, InMemoryItem>
// }>
//
// InMemoryItem: {
//   itemId:         string,
//   filename:       string,
//   sourceServerId: string | null,
//   sourcePath:     string,
//   destinationPath: string,
//   size:           number,
//   status:         string,
//   percent:        number,
//   error:          string | null,
// }

/**
 * TransferExecutor
 *
 * Singleton, in-process job runner for file transfer jobs. It owns:
 *   - a FIFO queue of pending job IDs (`this.queue`)
 *   - a map of currently-running jobs and their live progress state (`this.activeJobs`)
 *
 * Jobs are persisted to Mongo (TransferJob / TransferItem), but the executor also
 * keeps a parallel in-memory representation so that per-file progress (percent,
 * current status, etc.) can be tracked and broadcast via events without hitting
 * the DB on every progress tick.
 *
 * Because it extends EventEmitter, consumers (e.g. a websocket/SSE layer) can
 * subscribe to per-job events using the job ID as a namespace, e.g.:
 *   executor.on(`fileProgress:${jobId}`, (payload) => { ... })
 */
class TransferExecutor extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.activeJobs = new Map();
    this.MAX_CONCURRENT = 1;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add a job to the back of the queue and immediately try to start processing.
   * Safe to call even if the executor is currently busy — the job will simply
   * wait in `this.queue` until a slot frees up.
   */
  enqueue(jobId) {
    this.queue.push(jobId.toString());
    this._processQueue();
  }

  /**
   * Look up the live in-memory state for a currently-running job.
   * Returns null if the job isn't active (e.g. queued but not started,
   * already finished, or never existed).
   */
  getJob(jobId) {
    return this.activeJobs.get(jobId.toString()) ?? null;
  }

  /** Return a snapshot array of all currently-active (running) jobs. */
  listActive() {
    return [...this.activeJobs.values()];
  }

  /**
   * Request cancellation of a running job. This is cooperative: it just flips
   * a flag that `_executeJob`'s `shouldStop` callback checks between files.
   * It does NOT interrupt a file transfer that's already in progress, and it
   * has no effect on a job that's still sitting in `this.queue` (not yet active) —
   * a queued-but-not-started job can't be stopped this way since it has no
   * in-memory entry yet.
   */
  stopJob(jobId) {
    const job = this.activeJobs.get(jobId.toString());
    if (job) job.stopRequested = true;
  }

  // ─── Queue Processing ────────────────────────────────────────────────────────

  /**
   * Pull jobs off the front of the queue and start running them, up to
   * MAX_CONCURRENT at a time. Called after enqueue() and again at the end of
   * every job (success, failure, or cancellation) so the next queued job
   * picks up automatically.
   */
  _processQueue() {
    while (
      this.activeJobs.size < this.MAX_CONCURRENT &&
      this.queue.length > 0
    ) {
      const jobId = this.queue.shift();
      this._runJob(jobId).catch((err) => {
        console.error(`Executor: unhandled error in job ${jobId}:`, err);
      });
    }
  }

  /**
  * Full lifecycle for a single job: expand -> load -> execute -> finalize.
  * Each phase persists status changes to Mongo so the job's state survives
  * even if this process restarts mid-run (though in-memory progress, like
  * per-file percent, would be lost).
  */
  async _runJob(jobId) {
    // ── Phase 1: expand directories into file items ──────────────────────────
    await TransferJob.findByIdAndUpdate(jobId, {
      status: JobStatus.EXPANDING,
      startedAt: new Date(),
    });

    try {
      await expandJobItems(jobId);
    } catch (err) {
      console.error(`Executor: expansion failed for job ${jobId}:`, err);
      await TransferJob.findByIdAndUpdate(jobId, {
        status: JobStatus.FAILED,
        error: `Expansion failed: ${err.message}`,
        finishedAt: new Date(),
      });
      this._processQueue();
      return;
    }

    // ── Phase 2: load expanded items from DB into memory ─────────────────────
    // Re-fetch the job doc (in case expansion updated it) plus every expanded
    // file-kind item (directory items are excluded — only actual files get
    // transferred).
    const [jobDoc, itemDocs] = await Promise.all([
      TransferJob.findById(jobId),
      TransferItem.find({ jobId, kind: ItemKind.FILE }),
    ]);

    if (!jobDoc) {
      console.error(`Executor: job ${jobId} not found after expansion`);
      this._processQueue();
      return;
    }

    const items = new Map(
      itemDocs.map((doc) => [
        doc._id.toString(),
        {
          itemId: doc._id.toString(),
          filename: doc.filename,
          rootItem: doc.rootItem,
          sourceServerId: doc.sourceServerId,
          sourcePath: doc.sourcePath,
          destinationPath: doc.destinationPath,
          size: doc.size,
          status: doc.status,
          percent: 0,
          error: null,
        },
      ]),
    );

    const job = {
      jobId,
      status: JobStatus.RUNNING,
      destServerId: jobDoc.destServerId,
      destPath: jobDoc.destPath,
      totalFiles: items.size,
      completedFiles: 0,
      failedFiles: 0,
      currentFile: null,
      stopRequested: false,
      items,
    };

    this.activeJobs.set(jobId, job);

    await TransferJob.findByIdAndUpdate(jobId, {
      status: JobStatus.RUNNING,
      totalFiles: items.size,
    });

    // Tally how many items belong to each "root" (top-level selected
    // file/folder), useful for UI progress grouped by original selection
    // rather than by individual expanded file.
    const rootCounts = {};
    for (const item of items.values()) {
      rootCounts[item.rootItem] = (rootCounts[item.rootItem] || 0) + 1;
    }

    this.emit(`jobStart:${jobId}`, {
      totalFiles: items.size,
      rootCounts,
    });

    // ── Phase 3: execute ──────────────────────────────────────────────────────
    try {
      await this._executeJob(job);
    } catch (err) {
      // A thrown error here means the transfer machinery itself blew up
      // (e.g. couldn't connect to source/dest server) — distinct from an
      // individual file failing, which is handled via onFileFail instead
      // and does NOT throw.
      console.error(`Executor: job ${jobId} failed:`, err);
      await TransferJob.findByIdAndUpdate(jobId, {
        status: JobStatus.FAILED,
        error: err.message,
        finishedAt: new Date(),
      });
      this.emit(`jobDone:${jobId}`, {
        completed: job.completedFiles,
        failed: job.failedFiles,
        status: JobStatus.FAILED,
      });
      this.activeJobs.delete(jobId);
      this._processQueue();
      return;
    }

    // ── Phase 4: finalize ─────────────────────────────────────────────────────
    // Determine the terminal status:
    //   - CANCELLED if a stop was requested (regardless of how far it got)
    //   - FAILED only if EVERY file failed (zero completions)
    //   - COMPLETED otherwise — including partial success where some files
    //     failed but at least one succeeded. Callers relying on job.status
    //     alone won't be able to distinguish "fully clean" from "completed
    //     with some failures" — they need to also check failedFiles > 0.
    const finalStatus = job.stopRequested
      ? JobStatus.CANCELLED
      : job.failedFiles > 0 && job.completedFiles === 0
        ? JobStatus.FAILED
        : JobStatus.COMPLETED;

    await TransferJob.findByIdAndUpdate(jobId, {
      status: finalStatus,
      finishedAt: new Date(),
      currentFile: null,
    });

    this.emit(`jobDone:${jobId}`, {
      completed: job.completedFiles,
      failed: job.failedFiles,
      status: finalStatus,
    });

    this.activeJobs.delete(jobId);
    this._processQueue();
  }

  // ─── Execution Loop ──────────────────────────────────────────────────────────
  /**
    * Delegates the actual file-by-file transfer work to sftpService, wiring up
    * callbacks that keep both the in-memory `job`/`item` state and the
    * persisted DB records in sync, and re-broadcast progress as events.
    */
  async _executeJob(job) {
    const { executeTransferJob } = require("./sftpService");

    await executeTransferJob(job, {
      shouldStop: () => job.stopRequested,

      onFileStart: async (item) => {
        item.status = ItemStatus.IN_PROGRESS;
        job.currentFile = item.filename;
        await Promise.all([
          TransferItem.findByIdAndUpdate(item.itemId, {
            status: ItemStatus.IN_PROGRESS,
            startedAt: new Date(),
          }),
          TransferJob.findByIdAndUpdate(job.jobId, {
            currentFile: item.filename,
          }),
        ]);
        this.emit(`fileStart:${job.jobId}`, {
          file: item.filename,
          rootItem: item.rootItem,
          size: item.size,
        });
      },

      onFileProgress: (item, percent) => {
        item.percent = percent;
        this.emit(`fileProgress:${job.jobId}`, {
          file: item.filename,
          rootItem: item.rootItem,
          percent,
        });
      },

      onFileDone: async (item) => {
        item.status = ItemStatus.COMPLETED;
        item.percent = 100;
        job.completedFiles++;
        await Promise.all([
          TransferItem.findByIdAndUpdate(item.itemId, {
            status: ItemStatus.COMPLETED,
            completedAt: new Date(),
            size: item.size,
          }),
          TransferJob.findByIdAndUpdate(job.jobId, {
            $inc: {
              completedFiles: 1,
              transferredBytes: item.size || 0,
            },
          }),
        ]);
        this.emit(`fileDone:${job.jobId}`, {
          file: item.filename,
          rootItem: item.rootItem,
          completed: job.completedFiles,
          total: job.totalFiles,
        });
      },

      onFileFail: async (item, err) => {
        // A single file failing does NOT throw / abort the whole job — it's
        // recorded and the loop continues to the next file. Only an error
        // thrown out of executeTransferJob itself (caught in _runJob's
        // Phase 3) aborts the whole job.
        item.status = ItemStatus.FAILED;
        item.error = err.message;
        job.failedFiles++;
        await Promise.all([
          TransferItem.findByIdAndUpdate(item.itemId, {
            status: ItemStatus.FAILED,
            error: err.message,
            completedAt: new Date(),
          }),
          TransferJob.findByIdAndUpdate(job.jobId, {
            $inc: { failedFiles: 1 },
          }),
        ]);
        this.emit(`fileFail:${job.jobId}`, {
          file: item.filename,
          rootItem: item.rootItem,
          error: err.message,
        });
      },
    });
  }
}

// singleton
module.exports = new TransferExecutor();
