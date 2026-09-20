import type { JobStatus } from "../../controllers/jobs/jobConstants";

/**
 * Canonical persisted representation of a transfer job.
 *
 * A transfer job tracks the overall state and aggregate progress of a transfer.
 * Individual files and their per-item state are persisted separately by the
 * TransferItemStore.
 */
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

/**
 * Data required to create a transfer job.
 *
 * Fields not supplied by the caller are initialized by the store according
 * to the persistence model's defaults.
 */
export interface CreateTransferJobData {
  destPath: string;

  destServerId?: string | null;

  type?: string;
  status?: JobStatus;
}

/**
 * Aggregate transfer progress flushed from the active in-memory job state to
 * persistent storage.
 *
 * This allows frequently changing progress to be persisted in batches rather
 * than requiring a database write for every transfer update.
 */
export interface TransferJobPersistenceBatch {
  jobId: string;
  currentFile?: string;
  completedFiles: number;
  transferredBytes: number;
  failedFiles: number;
}

/**
 * Persistence contract for transfer jobs.
 *
 * A transfer job represents the overall lifecycle and aggregate progress of a
 * transfer. Store implementations are responsible for persisting state
 * transitions and returning the canonical TransferJob representation regardless
 * of the configured database backend.
 *
 * Active transfer execution is managed outside the store; this contract
 * provides the durable state used for history, status queries, and recovery.
 */
export abstract class TransferJobStore {
  /** Creates and persists a new transfer job. */
  abstract create(data: CreateTransferJobData): Promise<TransferJob>;

  /** Returns a transfer job by ID, or null when it does not exist. */
  abstract findById(id: string): Promise<TransferJob | null>;

  /**
   * Transitions a job into the expansion phase, where requested transfer items
   * are resolved into the concrete files that will be transferred.
   */
  abstract markExpanding(id: string): Promise<TransferJob | null>;

  /**
   * Transitions a job into its running state and records the start of transfer
   * execution.
   */
  abstract markRunning(id: string): Promise<TransferJob | null>;

  /**
   * Marks a job as failed and persists the error that caused the job to stop.
   */
  abstract markFailed(id: string, error: string): Promise<TransferJob | null>;

  /**
   * Records the file currently being processed by the transfer.
   */
  abstract setCurrentFile(
    id: string,
    filename: string,
  ): Promise<TransferJob | null>;

  /**
   * Records one successfully completed file and adds its transferred bytes to
   * the job's aggregate progress.
   */
  abstract incrementCompleted(
    id: string,
    bytes: number,
  ): Promise<TransferJob | null>;

  /**
   * Records one additional failed transfer item.
   */
  abstract incrementFailed(id: string): Promise<TransferJob | null>;

  /**
   * Updates aggregate job totals after transfer items have been expanded and
   * their final file counts and sizes are known.
   */
  abstract updateTotals(
    id: string,
    totalFiles: number,
    totalBytes: number,
    totalFailed: number,
  ): Promise<TransferJob | null>;

  /**
   * Finalizes a transfer job with its terminal status and completion state.
   */
  abstract finish(id: string, status: JobStatus): Promise<TransferJob | null>;

  /**
   * Returns persisted transfer jobs ordered from newest to oldest.
   */
  abstract listNewest(): Promise<TransferJob[]>;

  /**
   * Deletes a transfer job and returns the deleted record, or null when no
   * matching job exists.
   */
  abstract deleteById(id: string): Promise<TransferJob | null>;

  /**
   * Returns the IDs of transfer jobs that are eligible for completed-job
   * cleanup.
   */
  abstract findCompletedIds(): Promise<string[]>;

  /**
   * Deletes multiple transfer jobs and returns the number of records deleted.
   */
  abstract deleteByIds(ids: string[]): Promise<number>;

  /**
   * Persists an aggregate snapshot of the active job's runtime progress.
   *
   * Transfer execution maintains rapidly changing progress in memory and uses
   * this operation to periodically flush that state to durable storage.
   */
  abstract persistBatch(batch: TransferJobPersistenceBatch): Promise<void>;
}
