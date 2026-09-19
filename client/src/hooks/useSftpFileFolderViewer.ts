import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClipboard, type ClipboardItem } from "../contexts/ClipboardContext";
import { useTransferJob } from "./useTransferJob";
import apiClient from "../services/apiClient";
import { joinPath } from "../utils/path";
import { propIfPresent } from "../utils/propHelper";

import type {
  BreadcrumbEntry,
  FileBrowser,
  FileListing,
} from "../types/fileBrowser";

import type { AppToast, AppToastDetail, AppToastStatus } from "./useAppToast";
import { buildBreadcrumbs } from "../utils/breadcrumb";

interface SftpDirectoryResponse extends FileListing {
  currentDirectory: string;
}

interface CopyFilesResponse {
  jobId: string;
}

interface UseSftpFileFolderViewerOptions {
  serverId: string;
  toast: AppToast;
}

interface DeleteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

interface DeleteFilesResponse {
  results: DeleteFileResult[];
}

interface ShowToastOptions {
  persistent?: boolean;
  details?: AppToastDetail[];
}

const EMPTY_DIRECTORY: SftpDirectoryResponse = {
  currentDirectory: "/",
  files: [],
  folders: [],
};

export function useSftpFileFolderViewer({
  serverId,
  toast,
}: UseSftpFileFolderViewerOptions): FileBrowser {
  const [files, setFiles] = useState<SftpDirectoryResponse>(EMPTY_DIRECTORY);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDirectoryRef = useRef("/");

  const currentDirectory = files.currentDirectory ?? "/";

  const {
    copyFile: copyToClipboard,
    cutFile: cutToClipboard,
    clipboard,
    clearClipboard,
  } = useClipboard();

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  const showToast = useCallback(
    (
      title: string,
      status: AppToastStatus,
      description?: string,
      options?: ShowToastOptions,
    ): void => {
      toast({
        title,
        status,
        duration: 3000,
        ...propIfPresent("description", description),
        ...propIfPresent("persistent", options?.persistent),
        ...propIfPresent("details", options?.details),
      });
    },
    [toast],
  );

  // ---------------------------------------------------------------------------
  // Transfer tracking
  // ---------------------------------------------------------------------------

  const { progressMap, startedTransfers, trackJob } = useTransferJob({
    onError: () => {
      showToast("Transfer connection lost", "error");
    },
  });

  // ---------------------------------------------------------------------------
  // Current directory tracking
  // ---------------------------------------------------------------------------

  useEffect(() => {
    currentDirectoryRef.current = currentDirectory;
  }, [currentDirectory]);

  // ---------------------------------------------------------------------------
  // Directory loading
  // ---------------------------------------------------------------------------

  const connectToServer = useCallback(
    async (signal: AbortSignal): Promise<SftpDirectoryResponse> => {
      const data = await apiClient.get<SftpDirectoryResponse>(
        `/sftp/api/connect/${serverId}/`,
        {
          signal,
        },
      );

      setFiles(data);

      return data;
    },
    [serverId],
  );

  const changeDirectory = useCallback(
    async (directory: string): Promise<SftpDirectoryResponse | null> => {
      try {
        const data = await apiClient.get<SftpDirectoryResponse>(
          `/sftp/api/connect/${serverId}/${directory}/`,
        );

        setFiles(data);

        return data;
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          showToast("Error listing directory", "error");
        }

        return null;
      }
    },
    [serverId, showToast],
  );

  const reload = useCallback((): Promise<SftpDirectoryResponse | null> => {
    return changeDirectory(currentDirectory);
  }, [changeDirectory, currentDirectory]);

  // ---------------------------------------------------------------------------
  // Initial connection
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setFiles(EMPTY_DIRECTORY);

    const connect = async (): Promise<void> => {
      try {
        await connectToServer(controller.signal);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to connect to server";

        setError(message);

        showToast("Error connecting to server", "error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void connect();

    return () => {
      controller.abort();
    };
  }, [connectToServer, showToast]);

  // ---------------------------------------------------------------------------
  // Directory navigation
  // ---------------------------------------------------------------------------

  const openFolder = useCallback(
    (folderName: string): Promise<SftpDirectoryResponse | null> => {
      return changeDirectory(joinPath(currentDirectory, folderName));
    },
    [changeDirectory, currentDirectory],
  );

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFileBlob = useCallback((blob: Blob, fileName: string): void => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    // Revoking immediately can cancel a browser download
    // before it has started.
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 5000);
  }, []);

  const downloadFile = useCallback(
    (fileName: string): void => {
      const token = localStorage.getItem("token");

      const path = joinPath(
        "/sftp/api/download",
        serverId,
        currentDirectory,
        fileName,
      );

      const params = new URLSearchParams({
        ...(token ? { token } : {}),
        t: Date.now().toString(),
      });

      window.location.href = `${path}?${params}`;
    },
    [serverId, currentDirectory],
  );

  const downloadFolder = useCallback(
    async (folderName: string): Promise<void> => {
      try {
        const blob = await apiClient.getBlob(
          joinPath(
            "/sftp/api/download-folder",
            serverId,
            currentDirectory,
            folderName,
          ),
        );

        downloadFileBlob(blob, `${folderName}.zip`);

        showToast("Folder downloaded", "success");
      } catch (error: unknown) {
        console.error("Error downloading folder:", error);

        showToast("Error downloading folder", "error");
      }
    },
    [serverId, currentDirectory, downloadFileBlob, showToast],
  );

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  const deleteFilesRequest = useCallback(
    async (
      fileNames: string[],
      directory: string,
    ): Promise<DeleteFilesResponse> => {
      return apiClient.post<DeleteFilesResponse>("/sftp/api/delete-files", {
        currentDirectory: directory,
        serverId,
        fileNames,
      });
    },
    [serverId],
  );

  const deleteFile = useCallback(
    async (fileName: string): Promise<void> => {
      const deleteDirectory = currentDirectory;

      try {
        const { results } = await deleteFilesRequest(
          [fileName],
          deleteDirectory,
        );

        if (currentDirectoryRef.current === deleteDirectory) {
          await changeDirectory(deleteDirectory);
        }

        const result = results[0];

        if (result?.success) {
          showToast("File deleted", "success");
        } else {
          showToast("Error deleting file", "error", result?.error);
        }
      } catch (error: unknown) {
        console.error("Error deleting file:", error);

        showToast("Error deleting file", "error");
      }
    },
    [currentDirectory, deleteFilesRequest, changeDirectory, showToast],
  );

  const deleteFiles = useCallback(
    async (fileNames: string[]): Promise<void> => {
      if (fileNames.length === 0) {
        return;
      }

      const deleteDirectory = currentDirectory;

      try {
        const { results } = await deleteFilesRequest(
          fileNames,
          deleteDirectory,
        );

        if (currentDirectoryRef.current === deleteDirectory) {
          await changeDirectory(deleteDirectory);
        }

        const succeeded = results.filter((result) => result.success).length;

        const failedResults = results.filter((result) => !result.success);

        const failed = failedResults.length;

        if (failed === 0) {
          showToast(
            fileNames.length === 1
              ? "File deleted"
              : `${succeeded} files deleted`,
            "success",
          );
        } else if (succeeded === 0) {
          showToast(
            "Error deleting files",
            "error",
            `Failed to delete ${failed} ${failed === 1 ? "file" : "files"}`,
            {
              persistent: true,
              details: failedResults.map((result) => ({
                label: result.path,
                message: result.error ?? "Delete failed",
              })),
            },
          );
        } else {
          showToast(
            "Some files could not be deleted",
            "warning",
            `${succeeded} deleted, ${failed} failed`,
            {
              persistent: true,
              details: failedResults.map((result) => ({
                label: result.path,
                message: result.error ?? "Delete failed",
              })),
            },
          );
        }
      } catch (error: unknown) {
        console.error("Error deleting files:", error);

        showToast(
          "Error deleting files",
          "error",
          error instanceof Error ? error.message : "Delete request failed",
          {
            persistent: true,
          },
        );
      }
    },
    [currentDirectory, deleteFilesRequest, changeDirectory, showToast],
  );

  const renameFile = useCallback(
    async (fileName: string, newFileName: string): Promise<void> => {
      try {
        await apiClient.post("/sftp/api/renameFile", {
          currentPath: currentDirectory,
          fileName,
          newFileName,
          serverId,
        });

        await changeDirectory(currentDirectory);

        showToast("File renamed", "success");
      } catch (error: unknown) {
        console.error("Error renaming file:", error);

        showToast("Error renaming file", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  const shareFile = useCallback(
    async (fileName: string): Promise<void> => {
      const remotePath = joinPath(currentDirectory, fileName);

      try {
        await apiClient.post("/sftp/api/sharefile", {
          serverId,
          remotePath,
        });

        showToast("File shared", "success");
      } catch (error: unknown) {
        console.error("Error sharing file:", error);

        showToast("Error sharing file", "error");
      }
    },
    [serverId, currentDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

  const createFolder = useCallback(
    async (folderName: string): Promise<void> => {
      try {
        await apiClient.post("/sftp/api/create-folder", {
          currentPath: currentDirectory,
          serverId,
          folderName,
        });

        await changeDirectory(currentDirectory);

        showToast("Folder created", "success");
      } catch (error: unknown) {
        console.error("Error creating folder:", error);

        showToast("Error creating folder", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  const deleteFolder = useCallback(
    async (folderName: string): Promise<void> => {
      try {
        await apiClient.post("/sftp/api/delete-folder", {
          currentDirectory,
          serverId,
          deleteDir: folderName,
        });

        await changeDirectory(currentDirectory);

        showToast("Folder deleted", "success");
      } catch (error: unknown) {
        console.error("Error deleting folder:", error);

        showToast("Error deleting folder", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard operations
  // ---------------------------------------------------------------------------

  const copyFile = useCallback(
    (fileName: string): void => {
      copyToClipboard({
        file: fileName,
        path: currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: false,
      });
    },
    [copyToClipboard, currentDirectory, serverId],
  );

  const copyFolder = useCallback(
    (folderName: string): void => {
      copyToClipboard({
        file: folderName,
        path: currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: true,
      });
    },
    [copyToClipboard, currentDirectory, serverId],
  );

  const cutFile = useCallback(
    (fileName: string): void => {
      cutToClipboard({
        file: fileName,
        path: currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: false,
      });
    },
    [cutToClipboard, currentDirectory, serverId],
  );

  const paste = useCallback(async (): Promise<void> => {
    if (!clipboard.length) {
      return;
    }

    const destinationDirectory = currentDirectory;
    const items: ClipboardItem[] = [...clipboard];

    try {
      const { jobId } = await apiClient.post<CopyFilesResponse>(
        "/sftp/api/copy-files",
        {
          files: items,
          newPath: destinationDirectory,
          newServerId: serverId,
        },
      );

      clearClipboard();

      trackJob({
        jobId,
        items,

        onDone: () => {
          // Don't pull the user back to the directory
          // where the transfer originally started.
          if (currentDirectoryRef.current === destinationDirectory) {
            void changeDirectory(destinationDirectory);
          }
        },
      });
    } catch (error: unknown) {
      console.error("Error pasting files:", error);

      showToast("Error pasting files", "error");
    }
  }, [
    clipboard,
    currentDirectory,
    serverId,
    clearClipboard,
    trackJob,
    changeDirectory,
    showToast,
  ]);

  // ---------------------------------------------------------------------------
  // Breadcrumbs
  // ---------------------------------------------------------------------------

 const breadcrumbs = useMemo(
  () => buildBreadcrumbs(currentDirectory, "/"),
  [currentDirectory],
);

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    files: {
      files: files.files,
      folders: files.folders,
    },

    loading,

    currentPath: currentDirectory,

    openFolder,
    changeDirectory,
    reload,

    downloadFile,
    downloadFolder,

    deleteFile,
    deleteFiles,
    renameFile,
    shareFile,

    copyFile,
    cutFile,
    copyFolder,
    paste,

    createFolder,
    deleteFolder,

    breadcrumbs,

    progressMap,
    startedTransfers,
    error,
  };
}
