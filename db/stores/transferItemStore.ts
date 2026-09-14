export type TransferSourceType = "local" | "sftp" | "archive";

export type TransferItemKind = "file" | "directory";

export type TransferItemStatus =
  "pending" | "in_progress" | "completed" | "failed";

export interface TransferItem {
  _id: string;
  jobId: string;

  sourceServerId: string | null;
  sourceType: TransferSourceType;

  archivePath?: string;

  filename: string;
  sourcePath?: string;
  destinationPath?: string;

  kind: TransferItemKind;
  status: TransferItemStatus;

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

  kind?: TransferItemKind;
  status?: TransferItemStatus;

  rootItem: string;

  size?: number;
  bytesTransferred?: number;
}

export interface TransferSource {
  sourceType: TransferSourceType;
  sourceServerId: string | null;
}

export interface TransferItemPageOptions {
  status?: TransferItemStatus | "all";
  page: number;
  limit: number;
}

export interface TransferItemPage {
  items: TransferItem[];
  total: number;
}

export abstract class TransferItemStore {
  abstract createMany(items: CreateTransferItemData[]): Promise<TransferItem[]>;

  abstract findByJobId(jobId: string): Promise<TransferItem[]>;

  abstract findFilesByJobId(jobId: string): Promise<TransferItem[]>;

  abstract deleteById(id: string): Promise<TransferItem | null>;

  abstract markStarted(id: string): Promise<TransferItem | null>;

  abstract markCompleted(
    id: string,
    size: number,
  ): Promise<TransferItem | null>;

  abstract markFailed(id: string, error: string): Promise<TransferItem | null>;

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
}
