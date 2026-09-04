const TransferItemStore = require("../transferItemStore");
const TransferItem = require("../../../models/TransferItem");
const {
  ItemStatus,
  ItemKind,
} = require("../../../controllers/jobs/jobConstants");
const mongoose = require("mongoose");

class MongoTransferItemStore extends TransferItemStore {
  /**
   * Creates multiple transfer items.
   *
   * @param {Array<Object>} items
   * @returns {Promise<Array<Object>>}
   */
  async createMany(items) {
    const docs = await TransferItem.insertMany(items);

    return docs.map((doc) => doc.toObject());
  }

  /**
   * Returns all transfer items belonging to a job.
   *
   * @param {string} jobId
   * @returns {Promise<Array<Object>>}
   */
  async findByJobId(jobId) {
    return TransferItem.find({ jobId }).lean();
  }

  /**
   * Returns only file items belonging to a job.
   *
   * @param {string} jobId
   * @returns {Promise<Array<Object>>}
   */
  async findFilesByJobId(jobId) {
    return TransferItem.find({
      jobId,
      kind: ItemKind.FILE,
    }).lean();
  }

  /**
   * Deletes a transfer item by ID.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async deleteById(id) {
    return TransferItem.findByIdAndDelete(id).lean();
  }

  /**
   * Marks an item as in progress and records its start time.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async markStarted(id) {
    return TransferItem.findByIdAndUpdate(
      id,
      {
        status: ItemStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Marks an item as completed and stores its final size.
   *
   * @param {string} id
   * @param {number} size
   * @returns {Promise<Object|null>}
   */
  async markCompleted(id, size) {
    return TransferItem.findByIdAndUpdate(
      id,
      {
        status: ItemStatus.COMPLETED,
        completedAt: new Date(),
        size,
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Marks an item as failed and records the error.
   *
   * @param {string} id
   * @param {string} error
   * @returns {Promise<Object|null>}
   */
  async markFailed(id, error) {
    return TransferItem.findByIdAndUpdate(
      id,
      {
        status: ItemStatus.FAILED,
        error,
        completedAt: new Date(),
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Returns source server IDs grouped by job ID.
   *
   * @param {string[]} jobIds
   * @returns {Promise<Object<string, Array<string|null>>>}
   */
  async getSourceServerIdsByJobIds(jobIds) {
    if (!jobIds.length) {
      return {};
    }

    const rows = await TransferItem.aggregate([
      {
        $match: {
          jobId: {
            $in: jobIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$jobId",
          sourceServerIds: {
            $addToSet: "$sourceServerId",
          },
        },
      },
    ]);

    return Object.fromEntries(
      rows.map((row) => [row._id.toString(), row.sourceServerIds]),
    );
  }

  async getSourcesByJobIds(jobIds) {
  if (!jobIds.length) {
    return {};
  }

  const rows = await TransferItem.aggregate([
    {
      $match: {
        jobId: {
          $in: jobIds.map(
            (id) =>
              new mongoose.Types.ObjectId(id),
          ),
        },
      },
    },
    {
      $group: {
        _id: "$jobId",
        sources: {
          $addToSet: {
            sourceType: "$sourceType",
            sourceServerId: "$sourceServerId",
          },
        },
      },
    },
  ]);

  return Object.fromEntries(
    rows.map((row) => [
      row._id.toString(),
      row.sources,
    ]),
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
  async findPageByJobId(jobId, { status, page, limit }) {
    const filter = {
      jobId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      TransferItem.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      TransferItem.countDocuments(filter),
    ]);

    return {
      items,
      total,
    };
  }

  /**
   * Returns failed items belonging to a job.
   *
   * @param {string} jobId
   * @returns {Promise<TransferItem[]>}
   */
  async findFailedByJobId(jobId) {
    return TransferItem.find({
      jobId,
      status: ItemStatus.FAILED,
    }).lean();
  }

  /**
   * Deletes all items belonging to a job.
   *
   * @param {string} jobId
   * @returns {Promise<number>}
   */
  async deleteByJobId(jobId) {
    const result = await TransferItem.deleteMany({
      jobId,
    });

    return result.deletedCount ?? 0;
  }

  /**
   * Deletes all items belonging to any of the supplied jobs.
   *
   * @param {string[]} jobIds
   * @returns {Promise<number>}
   */
  async deleteByJobIds(jobIds) {
    if (!jobIds.length) {
      return 0;
    }

    const result = await TransferItem.deleteMany({
      jobId: { $in: jobIds },
    });

    return result.deletedCount ?? 0;
  }
}

module.exports = MongoTransferItemStore;
