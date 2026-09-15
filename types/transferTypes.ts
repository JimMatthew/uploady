import { TransferSourceType } from "../db/stores/transferItemStore";
import type {
  JobStatus as JobStatusType,
  ItemStatus as ItemStatusType,
} from "../controllers/jobs/jobConstants";

export interface InMemoryTransferItem {
  itemId: string;
  filename: string;
  rootItem: string;

  sourceServerId: string | null;
  sourceType: TransferSourceType;
  archivePath?: string;

  sourcePath: string;
  destinationPath: string;

  size: number;

  status: ItemStatusType;
  percent: number;
  error: string | null;
}

export interface TransferRoot {
  rootItem: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  percent: number;
  error: string | null;
}

export interface InMemoryTransferJob {
  jobId: string;
  status: JobStatusType;

  destServerId: string | null;
  destPath: string;

  totalFiles: number;
  completedFiles: number;
  failedFiles: number;

  currentFile: string | null;
  stopRequested: boolean;

  roots: Map<string, TransferRoot>;
  items: Map<string, InMemoryTransferItem>;
}

export interface TransferExecutionCallbacks {
  shouldStop(): boolean;

  onFileStart(item: InMemoryTransferItem): Promise<void>;

  onFileProgress(item: InMemoryTransferItem, percent: number): void;

  onFileDone(item: InMemoryTransferItem): Promise<void>;

  onFileFail(item: InMemoryTransferItem, error: Error): Promise<void>;
}