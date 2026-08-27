/**
 * Canonical TransferItem object returned by the persistence layer.
 *
 * All database implementations must return this structure regardless
 * of how the item is represented internally.
 *
 * @typedef {Object} TransferItem
 * @property {string} _id
 * @property {string} jobId
 * @property {string|null} sourceServerId
 * @property {string} filename
 * @property {string|undefined} sourcePath
 * @property {string|undefined} destinationPath
 * @property {string} kind
 * @property {string} status
 * @property {string} rootItem
 * @property {number} size
 * @property {number} bytesTransferred
 * @property {Date} [startedAt]
 * @property {Date} [completedAt]
 * @property {string} [error]
 */

class TransferItemStore {
    /**
     * Creates multiple transfer items.
     *
     * Each input item represents either a file or directory belonging
     * to a transfer job. Fields not supplied by the caller are initialized
     * to their implementation-independent defaults.
     *
     * @param {Array<Object>} items
     * @param {string} items[].jobId
     * @param {string|null} [items[].sourceServerId=null]
     * @param {string} items[].filename
     * @param {string} [items[].sourcePath]
     * @param {string} [items[].destinationPath]
     * @param {string} [items[].kind]
     * @param {string} [items[].status]
     * @param {string} items[].rootItem
     * @param {number} [items[].size=0]
     * @param {number} [items[].bytesTransferred=0]
     * @returns {Promise<TransferItem[]>}
     */
    async createMany(items) {
        throw new Error("TransferItemStore.createMany() not implemented");
    }

    /**
     * Returns all transfer items belonging to a job.
     *
     * @param {string} jobId
     * @returns {Promise<TransferItem[]>}
     */
    async findByJobId(jobId) {
        throw new Error(
            "TransferItemStore.findByJobId() not implemented",
        );
    }

    /**
     * Returns only file items belonging to a job.
     *
     * Directory placeholder items are excluded.
     *
     * @param {string} jobId
     * @returns {Promise<TransferItem[]>}
     */
    async findFilesByJobId(jobId) {
        throw new Error(
            "TransferItemStore.findFilesByJobId() not implemented",
        );
    }

    /**
     * Deletes a transfer item by ID.
     *
     * @param {string} id
     * @returns {Promise<TransferItem|null>}
     */
    async deleteById(id) {
        throw new Error("TransferItemStore.deleteById() not implemented");
    }

    /**
     * Marks an item as actively being processed and records its start time.
     *
     * @param {string} id
     * @returns {Promise<TransferItem|null>}
     */
    async markStarted(id) {
        throw new Error("TransferItemStore.markStarted() not implemented");
    }

    /**
     * Marks an item as successfully completed, records its completion
     * time, and stores its final size.
     *
     * @param {string} id
     * @param {number} size
     * @returns {Promise<TransferItem|null>}
     */
    async markCompleted(id, size) {
        throw new Error("TransferItemStore.markCompleted() not implemented");
    }

    /**
     * Marks an item as failed, records the error, and records its
     * completion time.
     *
     * @param {string} id
     * @param {string} error
     * @returns {Promise<TransferItem|null>}
     */
    async markFailed(id, error) {
        throw new Error("TransferItemStore.markFailed() not implemented");
    }

    /**
   * Returns source server IDs grouped by job ID.
   *
   * @param {string[]} jobIds
   * @returns {Promise<Object<string, Array<string|null>>>}
   */
    async getSourceServerIdsByJobIds(jobIds) {
        throw new Error(
            "TransferItemStore.getSourceServerIdsByJobIds() not implemented",
        );
    }

    /**
     * Returns one page of items belonging to a job.
     *
     * @param {string} jobId
     * @param {Object} options
     * @param {string} [options.status]
     * @param {number} options.page
     * @param {number} options.limit
     * @returns {Promise<{items: TransferItem[], total: number}>}
     */
    async findPageByJobId(jobId, options) {
        throw new Error(
            "TransferItemStore.findPageByJobId() not implemented",
        );
    }

    /**
     * Returns failed items belonging to a job.
     *
     * @param {string} jobId
     * @returns {Promise<TransferItem[]>}
     */
    async findFailedByJobId(jobId) {
        throw new Error(
            "TransferItemStore.findFailedByJobId() not implemented",
        );
    }

    /**
     * Deletes all items belonging to a job.
     *
     * @param {string} jobId
     * @returns {Promise<number>}
     */
    async deleteByJobId(jobId) {
        throw new Error(
            "TransferItemStore.deleteByJobId() not implemented",
        );
    }

    /**
     * Deletes all items belonging to any of the supplied jobs.
     *
     * @param {string[]} jobIds
     * @returns {Promise<number>}
     */
    async deleteByJobIds(jobIds) {
        throw new Error(
            "TransferItemStore.deleteByJobIds() not implemented",
        );
    }
}

module.exports = TransferItemStore;