const JobStatus = {
  QUEUED: "queued",
  PLANNING: "planning",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const ItemStatus = {
   PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
};

const ItemKind = {
  FILE: "file",
  DIRECTORY: "directory",
};

module.exports = { JobStatus, ItemKind, ItemStatus };