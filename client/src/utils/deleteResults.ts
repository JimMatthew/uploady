import type { AppToast } from "../hooks/useAppToast";
import type { DeleteFileResult } from "../types/fileBrowser";

interface HandleDeleteResultsOptions {
  results: DeleteFileResult[];
  requestedCount: number;
  showToast: AppToast;
}

/**
 * Shows the appropriate notification for a batch file delete result.
 */
export function handleDeleteResults({
  results,
  requestedCount,
  showToast,
}: HandleDeleteResultsOptions): void {
  const succeeded = results.filter((result) => result.success).length;
  const failedResults = results.filter((result) => !result.success);
  const failed = failedResults.length;

  if (failed === 0) {
    showToast({
      title:
        requestedCount === 1 ? "File deleted" : `${succeeded} files deleted`,
      status: "success",
    });

    return;
  }

  const details = failedResults.map((result) => ({
    label: result.path,
    message: result.error ?? "Delete failed",
  }));

  if (succeeded === 0) {
    showToast({
      title: "Error deleting files",
      status: "error",
      description: `Failed to delete ${failed} ${
        failed === 1 ? "file" : "files"
      }`,
      persistent: true,
      details,
    });

    return;
  }

  showToast({
    title: "Some files could not be deleted",
    status: "warning",
    description: `${succeeded} deleted, ${failed} failed`,
    persistent: true,
    details,
  });
}
