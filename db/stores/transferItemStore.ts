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

export abstract class TransferItemStore {
  abstract createMany(items: CreateTransferItemData[]): Promise<TransferItem[]>;

  abstract findByJobId(jobId: string): Promise<TransferItem[]>;

  abstract findFilesByJobId(jobId: string): Promise<TransferItem[]>;

  abstract deleteById(id: string): Promise<void>;

  abstract markStarted(id: string): Promise<void>;

  abstract markCompleted(
    id: string,
    size: number,
  ): Promise<TransferItem | null>;

  abstract markFailed(id: string, error: string): Promise<void>;

  abstract getSourceServerIdsByJobIds(
    jobIds: string[],
  ): Promise<Record<string, Array<string | null>>>;

  abstract getSourcesByJobIds(
    jobIds: string[],
  ): Promise<Record<string, TransferSource[]>>;

  abstract findPageByJobId(
    jobId: string,
    options: TransferItemPageOptions,
  ): Promise<TransferItemPage>;

  abstract findFailedByJobId(jobId: string): Promise<TransferItem[]>;

  abstract deleteByJobId(jobId: string): Promise<number>;

  abstract deleteByJobIds(jobIds: string[]): Promise<number>;

  abstract updateSize(id: string, size: number): Promise<void>;

  abstract persistBatch(batch: TransferItemPersistenceBatch): Promise<void>;

  abstract persistExpansion(batch: TransferItemExpansionBatch): Promise<void>;
}
