import { ItemKind, ItemStatus } from "../../controllers/jobs/jobConstants";

export type TransferSourceType = "local" | "sftp" | "archive";

export interface TransferItem {
  _id: string;
  jobId: string;

  sourceServerId: string | null;
  sourceType: TransferSourceType;

  archivePath?: string;

  filename: string;
  sourcePath?: string;
  destinationPath?: string;

  kind: ItemKind;
  status: ItemStatus;

  rootItem: string;

  size: number;
  bytesTransferred: number;

  startedAt?: Date;
  completedAt?: Date;

  error?: string;
}

export interface CreateTransferItemData {
  jobId: string;

  sourceServerId?: string | null;
  sourceType?: TransferSourceType;

  archivePath?: string;

  filename: string;
  sourcePath?: string;
  destinationPath?: string;

  kind?: ItemKind;
  status?: ItemStatus;

  rootItem: string;

  size?: number;
  bytesTransferred?: number;
}

export interface TransferSource {
  sourceType: TransferSourceType;
  sourceServerId: string | null;
}

export interface TransferItemPageOptions {
  status?: ItemStatus;
  page: number;
  limit: number;
}

export interface TransferItemPage {
  items: TransferItem[];
  total: number;
}

export interface TransferItemStartedUpdate {
  id: string;
  startedAt: Date;
}

export interface TransferItemCompletedUpdate {
  id: string;
  size: number;
  completedAt: Date;
}

export interface TransferItemFailedUpdate {
  id: string;
  error: string;
  failedAt: Date;
}

export interface TransferItemPersistenceBatch {
  started: TransferItemStartedUpdate[];
  completed: TransferItemCompletedUpdate[];
  failed: TransferItemFailedUpdate[];
}

export interface TransferItemExpansionBatch {
  sizeUpdates: Array<{
    id: string;
    size: number;
  }>;

  newItems: CreateTransferItemData[];

  deleteIds: string[];

  failures: Array<{
    id: string;
    error: string;
    failedAt: Date;
  }>;
}

/**
 * Persistence contract for the individual items belonging to transfer jobs.
 *
 * Transfer execution maintains its active state in memory while this store
 * provides durable transfer state for history, recovery, status queries, and
 * final results. Implementations must preserve the same transfer semantics
 * regardless of the configured database backend.
 */
export abstract class TransferItemStore {
  /** Persists a collection of transfer items and returns the stored records. */
  abstract createMany(items: CreateTransferItemData[]): Promise<TransferItem[]>;

  /** Returns every persisted item belonging to a transfer job. */
  abstract findByJobId(jobId: string): Promise<TransferItem[]>;

  /**
   * Returns file items belonging to a job, excluding non-file/root expansion
   * records where appropriate.
   */
  abstract findFilesByJobId(jobId: string): Promise<TransferItem[]>;

  abstract deleteById(id: string): Promise<void>;

  /** Marks an item as actively being transferred. */
  abstract markStarted(id: string): Promise<void>;

  /**
   * Marks an item complete, records its final size, and returns the updated
   * item when it exists.
   */
  abstract markCompleted(
    id: string,
    size: number,
  ): Promise<TransferItem | null>;

  /** Marks an item failed and persists its error message. */
  abstract markFailed(id: string, error: string): Promise<void>;

  /**
   * Returns the distinct source server IDs represented by each requested job.
   * Local sources are represented by null.
   */
  abstract getSourceServerIdsByJobIds(
    jobIds: string[],
  ): Promise<Record<string, Array<string | null>>>;

  /**
   * Returns the distinct source types and server IDs represented by each
   * requested transfer job.
   */
  abstract getSourcesByJobIds(
    jobIds: string[],
  ): Promise<Record<string, TransferSource[]>>;

  /**
   * Returns a paginated set of transfer items, optionally filtered by status,
   * together with the total number of matching items.
   */
  abstract findPageByJobId(
    jobId: string,
    options: TransferItemPageOptions,
  ): Promise<TransferItemPage>;

  /** Returns the failed items belonging to a transfer job. */
  abstract findFailedByJobId(jobId: string): Promise<TransferItem[]>;

  /** Deletes all items belonging to a job and returns the number deleted. */
  abstract deleteByJobId(jobId: string): Promise<number>;

  /**
   * Deletes items belonging to multiple jobs and returns the number deleted.
   */
  abstract deleteByJobIds(jobIds: string[]): Promise<number>;

  /** Updates the persisted size of an existing transfer item. */
  abstract updateSize(id: string, size: number): Promise<void>;

  /**
   * Persists accumulated runtime state changes as a single batch.
   *
   * Used by transfer execution to efficiently flush started, completed, and
   * failed state changes from its in-memory state to durable storage.
   */
  abstract persistBatch(batch: TransferItemPersistenceBatch): Promise<void>;

  /**
   * Atomically persists the results of expanding transfer items.
   *
   * Expansion may discover sizes, create child items, remove placeholder
   * items, or record failures. Keeping these changes together prevents the
   * persisted job from representing a partially applied expansion.
   */
  abstract persistExpansion(batch: TransferItemExpansionBatch): Promise<void>;
}
