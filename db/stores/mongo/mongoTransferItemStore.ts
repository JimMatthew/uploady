import mongoose from "mongoose";

import {
  TransferItemExpansionBatch,
  TransferItemPersistenceBatch,
  TransferItemStore,
  type CreateTransferItemData,
  type TransferItem,
  type TransferItemPage,
  type TransferItemPageOptions,
  type TransferSource,
  type TransferSourceType,
} from "../transferItemStore";

import TransferItemModel from "../../../models/TransferItem";
import { ItemStatus, ItemKind } from "../../../controllers/jobs/jobConstants";
import { propIfPresent } from "../../../shared/utils/PropHelper";

interface MongoTransferItem {
  _id: unknown;
  jobId: unknown;

  sourceServerId?: string | null;
  sourceType?: TransferSourceType | null;

  archivePath?: string | null;

  filename: string;

  sourcePath?: string | null;
  destinationPath?: string | null;

  kind: ItemKind;
  status: ItemStatus;

  rootItem: string;

  size: number;
  bytesTransferred: number;

  startedAt?: Date | null;
  completedAt?: Date | null;

  error?: string | null;
}

function toTransferItem(item: MongoTransferItem | null): TransferItem | null {
  if (!item) {
    return null;
  }

  return {
    _id: String(item._id),
    jobId: String(item.jobId),

    sourceServerId: item.sourceServerId ?? null,

    sourceType: item.sourceType ?? "local",

    ...(item.archivePath != null ? { archivePath: item.archivePath } : {}),

    filename: item.filename,

    ...(item.sourcePath != null ? { sourcePath: item.sourcePath } : {}),

    ...propIfPresent("destinationPath", item.destinationPath),

    kind: item.kind,
    status: item.status,

    rootItem: item.rootItem,

    size: item.size,
    bytesTransferred: item.bytesTransferred,

    ...(item.startedAt ? { startedAt: item.startedAt } : {}),

    ...(item.completedAt ? { completedAt: item.completedAt } : {}),

    ...(item.error != null ? { error: item.error } : {}),
  };
}

export class MongoTransferItemStore extends TransferItemStore {
 async persistExpansion(
  batch: TransferItemExpansionBatch,
): Promise<void> {
  const operations = [];

  // Update sizes for direct file items that already exist.
  for (const item of batch.sizeUpdates) {
    operations.push({
      updateOne: {
        filter: { _id: item.id },
        update: {
          $set: {
            size: item.size,
          },
        },
      },
    });
  }

  // Insert file items discovered while expanding directory placeholders.
  for (const item of batch.newItems) {
    operations.push({
      insertOne: {
        document: item,
      },
    });
  }

  // Remove directory placeholders after their expanded files have been added.
  for (const id of batch.deleteIds) {
    operations.push({
      deleteOne: {
        filter: { _id: id },
      },
    });
  }

  if (operations.length === 0) {
    return;
  }

  await TransferItemModel.bulkWrite(operations);
}
  async persistBatch(batch: TransferItemPersistenceBatch): Promise<void> {
    const operations = [];

    for (const item of batch.started) {
      operations.push({
        updateOne: {
          filter: { _id: item.id },
          update: {
            $set: {
              status: ItemStatus.IN_PROGRESS,
              startedAt: item.startedAt,
            },
          },
        },
      });
    }

    for (const item of batch.completed) {
      operations.push({
        updateOne: {
          filter: { _id: item.id },
          update: {
            $set: {
              status: ItemStatus.COMPLETED,
              completedAt: item.completedAt,
              size: item.size,
            },
          },
        },
      });
    }

    for (const item of batch.failed) {
      operations.push({
        updateOne: {
          filter: { _id: item.id },
          update: {
            $set: {
              status: ItemStatus.FAILED,
              error: item.error,
              completedAt: item.failedAt,
            },
          },
        },
      });
    }

    if (operations.length === 0) {
      return;
    }

    await TransferItemModel.bulkWrite(operations);
  }
  async createMany(items: CreateTransferItemData[]): Promise<TransferItem[]> {
    const docs = await TransferItemModel.insertMany(items);

    return docs
      .map((doc) => toTransferItem(doc.toObject() as MongoTransferItem))
      .filter((item): item is TransferItem => item !== null);
  }

  async findByJobId(jobId: string): Promise<TransferItem[]> {
    const rows = await TransferItemModel.find({
      jobId,
    }).lean();

    return rows
      .map((row) => toTransferItem(row as MongoTransferItem))
      .filter((item): item is TransferItem => item !== null);
  }

  async findFilesByJobId(jobId: string): Promise<TransferItem[]> {
    const rows = await TransferItemModel.find({
      jobId,
      kind: ItemKind.FILE,
    }).lean();

    return rows
      .map((row) => toTransferItem(row as MongoTransferItem))
      .filter((item): item is TransferItem => item !== null);
  }

  async deleteById(id: string): Promise<void> {
    const row = await TransferItemModel.findByIdAndDelete(id).lean();
  }

  async markStarted(id: string): Promise<void> {
    await TransferItemModel.updateOne(
      { _id: id },
      {
        $set: {
          status: ItemStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      },
    );
  }

  async markCompleted(id: string, size: number): Promise<TransferItem | null> {
    const row = await TransferItemModel.findByIdAndUpdate(
      id,
      {
        status: ItemStatus.COMPLETED,
        completedAt: new Date(),
        size,
      },
      {
        new: true,
      },
    ).lean();

    return toTransferItem(row as MongoTransferItem | null);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const row = await TransferItemModel.findByIdAndUpdate(
      id,
      {
        status: ItemStatus.FAILED,
        error,
        completedAt: new Date(),
      },
      {
        new: true,
      },
    ).lean();
  }
  async updateSize(id: string, size: number): Promise<void> {
    await TransferItemModel.findByIdAndUpdate(id, {
      $set: { size },
    });
  }

  async getSourceServerIdsByJobIds(
    jobIds: string[],
  ): Promise<Record<string, Array<string | null>>> {
    if (!jobIds.length) {
      return {};
    }

    const rows = await TransferItemModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      sourceServerIds: Array<string | null>;
    }>([
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

  async getSourcesByJobIds(
    jobIds: string[],
  ): Promise<Record<string, TransferSource[]>> {
    if (!jobIds.length) {
      return {};
    }

    const rows = await TransferItemModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      sources: Array<{
        sourceType: TransferSourceType | null;
        sourceServerId: string | null;
      }>;
    }>([
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

        row.sources.map((source): TransferSource => ({
          sourceType: source.sourceType ?? "local",

          sourceServerId: source.sourceServerId ?? null,
        })),
      ]),
    );
  }

  async findPageByJobId(
    jobId: string,
    { status, page, limit }: TransferItemPageOptions,
  ): Promise<TransferItemPage> {
    const filter: {
      jobId: string;
      status?: ItemStatus;
    } = {
      jobId,
    };

    if (status) {
      filter.status = status;
    }

    const [rows, total] = await Promise.all([
      TransferItemModel.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      TransferItemModel.countDocuments(filter),
    ]);

    const items = rows
      .map((row) => toTransferItem(row as MongoTransferItem))
      .filter((item): item is TransferItem => item !== null);

    return {
      items,
      total,
    };
  }

  async findFailedByJobId(jobId: string): Promise<TransferItem[]> {
    const rows = await TransferItemModel.find({
      jobId,
      status: ItemStatus.FAILED,
    }).lean();

    return rows
      .map((row) => toTransferItem(row as MongoTransferItem))
      .filter((item): item is TransferItem => item !== null);
  }

  async deleteByJobId(jobId: string): Promise<number> {
    const result = await TransferItemModel.deleteMany({
      jobId,
    });

    return result.deletedCount ?? 0;
  }

  async deleteByJobIds(jobIds: string[]): Promise<number> {
    if (!jobIds.length) {
      return 0;
    }

    const result = await TransferItemModel.deleteMany({
      jobId: {
        $in: jobIds,
      },
    });

    return result.deletedCount ?? 0;
  }
}
