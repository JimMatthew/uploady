export const JobStatus = {
  QUEUED: "queued",
  PLANNING: "planning",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const ItemStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export const ItemKind = {
  FILE: "file",
  DIRECTORY: "directory",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

export type ItemKind = (typeof ItemKind)[keyof typeof ItemKind];
