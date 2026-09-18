import type { JobStatus } from "../../controllers/jobs/jobConstants";

export interface TransferJob {
  _id: string;

  status: JobStatus;
  type: string;

  destServerId: string | null;
  destPath: string;

  currentFile: string | null;

  totalFiles: number;
  completedFiles: number;
  failedFiles: number;

  totalBytes: number;
  transferredBytes: number;

  error: string | null;

  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface CreateTransferJobData {
  destPath: string;

  destServerId?: string | null;

  type?: string;
  status?: JobStatus;
}

export interface TransferJobPersistenceBatch {
  jobId: string;
  currentFile?: string;
  completedFiles: number;
  transferredBytes: number;
  failedFiles: number;
}

export abstract class TransferJobStore {
  abstract create(data: CreateTransferJobData): Promise<TransferJob>;

  abstract findById(id: string): Promise<TransferJob | null>;

  abstract markExpanding(id: string): Promise<TransferJob | null>;

  abstract markRunning(id: string): Promise<TransferJob | null>;

  abstract markFailed(id: string, error: string): Promise<TransferJob | null>;

  abstract setCurrentFile(
    id: string,
    filename: string,
  ): Promise<TransferJob | null>;

  abstract incrementCompleted(
    id: string,
    bytes: number,
  ): Promise<TransferJob | null>;

  abstract incrementFailed(id: string): Promise<TransferJob | null>;

  abstract updateTotals(
    id: string,
    totalFiles: number,
    totalBytes: number,
    totalFailed: number,
  ): Promise<TransferJob | null>;

  abstract finish(id: string, status: JobStatus): Promise<TransferJob | null>;

  abstract listNewest(): Promise<TransferJob[]>;

  abstract deleteById(id: string): Promise<TransferJob | null>;

  abstract findCompletedIds(): Promise<string[]>;

  abstract deleteByIds(ids: string[]): Promise<number>;

  abstract persistBatch(batch: TransferJobPersistenceBatch): Promise<void>;
}
