import {
  TransferJobStore,
  type CreateTransferJobData,
  type TransferJob,
} from "../transferJobStore";

import TransferJobModel from "../../../models/transferJobs";

import {
  JobStatus,
  type JobStatus as JobStatusType,
} from "../../../controllers/jobs/jobConstants";

interface MongoTransferJob {
  _id: unknown;

  status: JobStatusType;
  type: string;

  destServerId?: string | null;
  destPath: string;

  currentFile?: string | null;

  totalFiles: number;
  completedFiles: number;
  failedFiles: number;

  totalBytes: number;
  transferredBytes: number;

  error?: string | null;

  createdAt: Date;

  startedAt?: Date | null;
  finishedAt?: Date | null;
}

function toTransferJob(job: MongoTransferJob | null): TransferJob | null {
  if (!job) {
    return null;
  }

  return {
    _id: String(job._id),

    status: job.status,
    type: job.type,

    destServerId: job.destServerId ?? null,

    destPath: job.destPath,

    currentFile: job.currentFile ?? null,

    totalFiles: job.totalFiles,

    completedFiles: job.completedFiles,

    failedFiles: job.failedFiles,

    totalBytes: job.totalBytes,

    transferredBytes: job.transferredBytes,

    error: job.error ?? null,

    createdAt: job.createdAt,

    ...(job.startedAt ? { startedAt: job.startedAt } : {}),

    ...(job.finishedAt ? { finishedAt: job.finishedAt } : {}),
  };
}

export class MongoTransferJobStore extends TransferJobStore {
  async create(data: CreateTransferJobData): Promise<TransferJob> {
    const job = await TransferJobModel.create(data);

    const result = toTransferJob(job.toObject() as MongoTransferJob);

    if (!result) {
      throw new Error("Failed to create transfer job");
    }

    return result;
  }

  async findById(id: string): Promise<TransferJob | null> {
    const job = await TransferJobModel.findById(id).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async markExpanding(id: string): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        status: JobStatus.PLANNING,

        startedAt: new Date(),
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async markRunning(
    id: string,
    totalFiles: number,
  ): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        status: JobStatus.RUNNING,

        totalFiles,
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async markFailed(id: string, error: string): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        status: JobStatus.FAILED,

        error,

        finishedAt: new Date(),
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async setCurrentFile(
    id: string,
    filename: string,
  ): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        currentFile: filename,
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async incrementCompleted(
    id: string,
    bytes: number,
  ): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        $inc: {
          completedFiles: 1,
          transferredBytes: bytes || 0,
        },
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async incrementFailed(id: string): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        $inc: {
          failedFiles: 1,
        },
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async updateTotals(
    id: string,
    totalFiles: number,
    totalBytes: number,
  ): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        totalFiles,
        totalBytes,
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async finish(id: string, status: JobStatusType): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndUpdate(
      id,
      {
        status,

        finishedAt: new Date(),

        currentFile: null,
      },
      {
        new: true,
      },
    ).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async listNewest(): Promise<TransferJob[]> {
    const jobs = await TransferJobModel.find()
      .sort({
        createdAt: -1,
      })
      .lean();

    return jobs
      .map((job) => toTransferJob(job as MongoTransferJob))
      .filter((job): job is TransferJob => job !== null);
  }

  async deleteById(id: string): Promise<TransferJob | null> {
    const job = await TransferJobModel.findByIdAndDelete(id).lean();

    return toTransferJob(job as MongoTransferJob | null);
  }

  async findCompletedIds(): Promise<string[]> {
    const jobs = await TransferJobModel.find({
      status: JobStatus.COMPLETED,
    })
      .select("_id")
      .lean();

    return jobs.map((job) => String(job._id));
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (!ids.length) {
      return 0;
    }

    const result = await TransferJobModel.deleteMany({
      _id: {
        $in: ids,
      },
    });

    return result.deletedCount ?? 0;
  }
}
