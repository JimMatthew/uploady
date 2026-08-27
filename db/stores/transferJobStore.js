/**
 * Canonical TransferJob object returned by the persistence layer.
 *
 * All database implementations must return this structure regardless
 * of how the job is represented internally.
 *
 * @typedef {Object} TransferJob
 * @property {string} _id
 * @property {string} status
 * @property {string} type
 * @property {string|null} destServerId
 * @property {string} destPath
 * @property {string|null} currentFile
 * @property {number} totalFiles
 * @property {number} completedFiles
 * @property {number} failedFiles
 * @property {number} totalBytes
 * @property {number} transferredBytes
 * @property {string|null} error
 * @property {Date} createdAt
 * @property {Date} [startedAt]
 * @property {Date} [finishedAt]
 */

class TransferJobStore {
  /**
   * Creates a transfer job.
   *
   * Fields not provided by the caller are initialized to their
   * implementation-independent defaults.
   *
   * @param {Object} data
   * @param {string} data.destPath
   * @param {string|null} [data.destServerId=null]
   * @param {string} [data.type="copy"]
   * @param {string} [data.status]
   * @returns {Promise<TransferJob>}
   */
  async create(data) {
    throw new Error("TransferJobStore.create() not implemented");
  }

  /**
   * Finds a transfer job by ID.
   *
   * @param {string} id
   * @returns {Promise<TransferJob|null>}
   */
  async findById(id) {
    throw new Error("TransferJobStore.findById() not implemented");
  }

  /**
   * Marks a job as expanding and records its start time.
   *
   * @param {string} id
   * @returns {Promise<TransferJob|null>}
   */
  async markExpanding(id) {
    throw new Error("TransferJobStore.markExpanding() not implemented");
  }

  /**
   * Marks a job as running and stores its total file count.
   *
   * @param {string} id
   * @param {number} totalFiles
   * @returns {Promise<TransferJob|null>}
   */
  async markRunning(id, totalFiles) {
    throw new Error("TransferJobStore.markRunning() not implemented");
  }

  /**
   * Marks a job as failed, records the error, and records its finish time.
   *
   * @param {string} id
   * @param {string} error
   * @returns {Promise<TransferJob|null>}
   */
  async markFailed(id, error) {
    throw new Error("TransferJobStore.markFailed() not implemented");
  }

  /**
   * Sets the filename currently being processed by the job.
   *
   * @param {string} id
   * @param {string} filename
   * @returns {Promise<TransferJob|null>}
   */
  async setCurrentFile(id, filename) {
    throw new Error("TransferJobStore.setCurrentFile() not implemented");
  }

  /**
   * Atomically increments the completed file count by one and adds
   * the supplied number of bytes to transferredBytes.
   *
   * @param {string} id
   * @param {number} bytes
   * @returns {Promise<TransferJob|null>}
   */
  async incrementCompleted(id, bytes) {
    throw new Error(
      "TransferJobStore.incrementCompleted() not implemented",
    );
  }

  /**
   * Atomically increments the failed file count by one.
   *
   * @param {string} id
   * @returns {Promise<TransferJob|null>}
   */
  async incrementFailed(id) {
    throw new Error(
      "TransferJobStore.incrementFailed() not implemented",
    );
  }

  /**
   * Updates the total number of files and bytes represented by the job.
   *
   * @param {string} id
   * @param {number} totalFiles
   * @param {number} totalBytes
   * @returns {Promise<TransferJob|null>}
   */
  async updateTotals(id, totalFiles, totalBytes) {
    throw new Error(
      "TransferJobStore.updateTotals() not implemented",
    );
  }

  /**
   * Finalizes a transfer job with the supplied status.
   *
   * The implementation must record the finish time and clear
   * currentFile.
   *
   * @param {string} id
   * @param {string} status
   * @returns {Promise<TransferJob|null>}
   */
  async finish(id, status) {
    throw new Error("TransferJobStore.finish() not implemented");
  }

  /**
 * Returns all jobs newest first.
 *
 * @returns {Promise<TransferJob[]>}
 */
async listNewest() {
  throw new Error(
    "TransferJobStore.listNewest() not implemented",
  );
}

/**
 * Deletes a job by ID.
 *
 * @param {string} id
 * @returns {Promise<TransferJob|null>}
 */
async deleteById(id) {
  throw new Error(
    "TransferJobStore.deleteById() not implemented",
  );
}

/**
 * Returns IDs of all completed jobs.
 *
 * @returns {Promise<string[]>}
 */
async findCompletedIds() {
  throw new Error(
    "TransferJobStore.findCompletedIds() not implemented",
  );
}

/**
 * Deletes all jobs matching the supplied IDs.
 *
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
async deleteByIds(ids) {
  throw new Error(
    "TransferJobStore.deleteByIds() not implemented",
  );
}
}

module.exports = TransferJobStore;