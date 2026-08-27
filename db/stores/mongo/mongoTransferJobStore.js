const TransferJobStore = require("../transferJobStore");
const TransferJob = require("../../../models/transferJobs");
const { JobStatus } = require("../../../controllers/jobs/jobConstants");

class MongoTransferJobStore extends TransferJobStore {
  /**
   * Creates a transfer job.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const job = await TransferJob.create(data);
    return job.toObject();
  }

  /**
   * Finds a transfer job by ID.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return TransferJob.findById(id).lean();
  }

  /**
   * Marks a transfer job as expanding and records its start time.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async markExpanding(id) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        status: JobStatus.EXPANDING,
        startedAt: new Date(),
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Marks a transfer job as running and stores its total file count.
   *
   * @param {string} id
   * @param {number} totalFiles
   * @returns {Promise<Object|null>}
   */
  async markRunning(id, totalFiles) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        status: JobStatus.RUNNING,
        totalFiles,
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Marks a transfer job as failed, stores the error, and records
   * its finish time.
   *
   * @param {string} id
   * @param {string} error
   * @returns {Promise<Object|null>}
   */
  async markFailed(id, error) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        status: JobStatus.FAILED,
        error,
        finishedAt: new Date(),
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Sets the filename currently being processed.
   *
   * @param {string} id
   * @param {string} filename
   * @returns {Promise<Object|null>}
   */
  async setCurrentFile(id, filename) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        currentFile: filename,
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Atomically increments completedFiles by one and adds the supplied
   * byte count to transferredBytes.
   *
   * @param {string} id
   * @param {number} bytes
   * @returns {Promise<Object|null>}
   */
  async incrementCompleted(id, bytes) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        $inc: {
          completedFiles: 1,
          transferredBytes: bytes || 0,
        },
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Atomically increments failedFiles by one.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async incrementFailed(id) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        $inc: {
          failedFiles: 1,
        },
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Updates the total number of files and bytes represented by the job.
   *
   * @param {string} id
   * @param {number} totalFiles
   * @param {number} totalBytes
   * @returns {Promise<Object|null>}
   */
  async updateTotals(id, totalFiles, totalBytes) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        totalFiles,
        totalBytes,
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Finalizes a transfer job.
   *
   * Records the final status and finish time and clears currentFile.
   *
   * @param {string} id
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  async finish(id, status) {
    return TransferJob.findByIdAndUpdate(
      id,
      {
        status,
        finishedAt: new Date(),
        currentFile: null,
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Returns all jobs newest first.
   *
   * @returns {Promise<TransferJob[]>}
   */
  async listNewest() {
    return TransferJob.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * Deletes a job by ID.
   *
   * @param {string} id
   * @returns {Promise<TransferJob|null>}
   */
  async deleteById(id) {
    return TransferJob.findByIdAndDelete(id).lean();
  }

  /**
   * Returns IDs of all completed jobs.
   *
   * @returns {Promise<string[]>}
   */
  async findCompletedIds() {
    const jobs = await TransferJob.find({
      status: JobStatus.COMPLETED,
    })
      .select("_id")
      .lean();

    return jobs.map((job) => job._id.toString());
  }

  /**
   * Deletes all jobs matching the supplied IDs.
   *
   * @param {string[]} ids
   * @returns {Promise<number>}
   */
  async deleteByIds(ids) {
    if (!ids.length) {
      return 0;
    }

    const result = await TransferJob.deleteMany({
      _id: { $in: ids },
    });

    return result.deletedCount ?? 0;
  }
}

module.exports = MongoTransferJobStore;
