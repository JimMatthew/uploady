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

class TransferExecutor extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.activeJobs = new Map();
    this.MAX_CONCURRENT = 1;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  enqueue(jobId) {
    this.queue.push(jobId.toString());
    this._processQueue();
  }

  getJob(jobId) {
    return this.activeJobs.get(jobId.toString()) ?? null;
  }

  listActive() {
    return [...this.activeJobs.values()];
  }

  stopJob(jobId) {
    const job = this.activeJobs.get(jobId.toString());
    if (job) job.stopRequested = true;
  }

  // ─── Queue Processing ────────────────────────────────────────────────────────

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

  async _executeJob(job) {
    const { executeTransferJob} = require("./sftpService");

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
