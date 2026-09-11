export type TransferStatus =
  | "queued"
  | "planning"
  | "expanding"
  | "running"
  | "in_progress"
  | "completed"
  | "failed"
  | "partial"
  | "cancelled"
  | "pending"
  | "skipped";


export type TransferItemFilter = "all" | TransferStatus;

export interface TransferItem {
  _id: string;

  filename: string;
  sourcePath: string;
  destinationPath: string;
  sourceServer?: string | null;

  status: TransferStatus;

  size?: number | null;
  durationMs?: number | null;
  speedMBs?: number | null;

  startedAt?: string | null;
  completedAt?: string | null;

  error?: string | null;
}

export interface TransferJob {
  _id: string;
  status: TransferStatus;

  sourceServers?: string[] | null;

  destServer: string;
  destPath: string;

  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalBytes: number;

  durationMs?: number | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface TransferRootProgress {
  total: number;
  completed: number;
  failed: number;
  progress?: number | null;
}

export type TransferProgressMap = Record<
  string,
  TransferRootProgress
>;