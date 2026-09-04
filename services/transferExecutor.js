const EventEmitter = require("events");
const { transferJobs, transferItems } = require("../db");
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
 * Singleton, in-process job runner for file transfer jobs.
 *
 * Persistent job/item state is accessed only through the database
 * adapter layer. The executor also keeps a parallel in-memory
 * representation so live progress can be tracked and broadcast
 * without writing every progress update to the database.
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
   * Adds a job to the FIFO queue and attempts to start processing.
   *
   * @param {string} jobId
   */
  enqueue(jobId) {
    this.queue.push(jobId.toString());
    this._processQueue();
  }

  /**
   * Returns the live in-memory state for a running job.
   *
   * @param {string} jobId
   * @returns {Object|null}
   */
  getJob(jobId) {
    return this.activeJobs.get(jobId.toString()) ?? null;
  }

  /**
   * Returns all currently-active jobs.
   *
   * @returns {Object[]}
   */
  listActive() {
    return [...this.activeJobs.values()];
  }

  /**
   * Requests cooperative cancellation of a running job.
   *
   * The currently-running file is not interrupted. Cancellation
   * takes effect between file transfers.
   *
   * @param {string} jobId
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

  // ─── Job Lifecycle ─────────────────────────────────────────────────────────

  /**
   * Runs the complete lifecycle for one transfer job:
   *
   *   expand → load → execute → finalize
   *
   * @param {string} jobId
   */
  async _runJob(jobId) {
    // ── Phase 1: expand directories into file items ──────────────────────────

    await transferJobs.markExpanding(jobId);

    try {
      await expandJobItems(jobId);
    } catch (err) {
      console.error(`Executor: expansion failed for job ${jobId}:`, err);
      await transferJobs.markFailed(jobId, `Expansion failed: ${err.message}`);
      this._processQueue();
      return;
    }

    // ── Phase 2: load expanded items from DB into memory ─────────────────────

    const [jobDoc, itemDocs] = await Promise.all([
      transferJobs.findById(jobId),
      transferItems.findFilesByJobId(jobId),
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
          sourceType: doc.sourceType,
          archivePath: doc.archivePath,
          size: doc.size,
          status: doc.status,
          percent: 0,
          error: null,
        },
      ]),
    );
    const roots = new Map();

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
      roots,
      items,
    };

    this.activeJobs.set(jobId, job);

    await transferJobs.markRunning(jobId, items.size);

    // Count files grouped by the original top-level selected item.
    const rootCounts = {};
    for (const item of items.values()) {
      rootCounts[item.rootItem] = (rootCounts[item.rootItem] || 0) + 1;
    }

    this.emit(`jobStart:${jobId}`, {
      roots: [...job.roots.values()],
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
      await transferJobs.markFailed(jobId, err.message);
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

    await transferJobs.finish(jobId, finalStatus);

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

      // ── File Start ────────────────────────────────────────────────────────

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

      // ── File Progress ─────────────────────────────────────────────────────

      onFileProgress: (item, percent) => {
        item.percent = percent;

        const root = job.roots.get(item.rootItem);

        // Meaningful for roots that represent a single file.
        if (root.totalFiles === 1) {
          root.percent = percent;

          this.emit(`rootProgress:${job.jobId}`, {
            ...root,
          });
        }
      },

      // ── File Completed ────────────────────────────────────────────────────

      onFileDone: async (item) => {
        item.status = ItemStatus.COMPLETED;
        item.percent = 100;

        job.completedFiles++;

        const root = job.roots.get(item.rootItem);
        root.completedFiles++;

        await Promise.all([
          transferItems.markCompleted(item.itemId, item.size),
          transferJobs.incrementCompleted(job.jobId, item.size),
        ]);

        this.emit(`rootProgress:${job.jobId}`, {
          ...root,
        });
      },

      // ── File Failed ───────────────────────────────────────────────────────

      onFileFail: async (item, err) => {
        // A single file failing does NOT throw / abort the whole job — it's
        // recorded and the loop continues to the next file. Only an error
        // thrown out of executeTransferJob itself (caught in _runJob's
        // Phase 3) aborts the whole job.
        item.status = ItemStatus.FAILED;
        item.error = err.message;

        job.failedFiles++;

        const root = job.roots.get(item.rootItem);
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

// singleton
module.exports = new TransferExecutor();
