import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";
import apiClient, { ApiError } from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";
import { useTransferJob } from "../hooks/useTransferJob";
import type { AppToast, AppToastDetail, AppToastStatus } from "./useAppToast";
import { propIfPresent } from "../utils/propHelper";

import type {
  BreadcrumbEntry,
  FileBrowser,
  FileListing,
} from "../types/fileBrowser";

interface UseFileListOptions {
  toast: AppToast;
}

interface PasteResponse {
  jobId: string;
}

interface LocalDirectoryResponse extends FileListing {
  currentDirectory: string;
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

const EMPTY_DIRECTORY: LocalDirectoryResponse = {
  currentDirectory: "",
  files: [],
  folders: [],
};

export function useFileList({ toast }: UseFileListOptions): FileBrowser {
  const [files, setFiles] = useState<LocalDirectoryResponse>(EMPTY_DIRECTORY);

  const [loading, setLoading] = useState(true);

  const currentDirectoryRef = useRef("");
  const requestIdRef = useRef(0);

  const navigate = useNavigate();

  const {
    copyFile: copyToClipboard,
    cutFile: cutToClipboard,
    clipboard,
    clearClipboard,
  } = useClipboard();

  const currentDirectory = files.currentDirectory;

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
  // Helpers
  // ---------------------------------------------------------------------------

  const downloadFileBlob = useCallback((blob: Blob, fileName: string): void => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  }, []);

  const encodePath = useCallback((path: string): string => {
    return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  }, []);

  // ---------------------------------------------------------------------------
  // Directory loading
  // ---------------------------------------------------------------------------

  const changeDirectory = useCallback(
    async (directory: string): Promise<LocalDirectoryResponse | null> => {
      const requestId = ++requestIdRef.current;

      try {
        const encodedDirectory = encodePath(directory);

        const data = await apiClient.get<LocalDirectoryResponse>(
          encodedDirectory ? `/api/files/${encodedDirectory}/` : "/api/files/",
        );

        // Ignore responses belonging to an older navigation request.
        if (requestId !== requestIdRef.current) {
          return null;
        }

        setFiles(data);

        return data;
      } catch (error: unknown) {
        if (requestId !== requestIdRef.current) {
          return null;
        }

        const status = error instanceof ApiError ? error.status : undefined;

        if (status === 401 || status === 403) {
          navigate("/");
          return null;
        }

        console.error("Error listing directory:", error);

        showToast("Error listing directory", "error");

        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [encodePath, navigate, showToast],
  );

  const reload = useCallback((): Promise<LocalDirectoryResponse | null> => {
    return changeDirectory(currentDirectory);
  }, [changeDirectory, currentDirectory]);

  // ---------------------------------------------------------------------------
  // Initial directory loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);

    void changeDirectory("");
  }, [changeDirectory, navigate]);

  // ---------------------------------------------------------------------------
  // Directory navigation
  // ---------------------------------------------------------------------------

  const openFolder = useCallback(
    (folderName: string): Promise<LocalDirectoryResponse | null> => {
      return changeDirectory(joinPath(currentDirectory, folderName));
    },
    [changeDirectory, currentDirectory],
  );

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFile = useCallback(
    async (fileName: string): Promise<void> => {
      try {
        const directory = encodePath(currentDirectory);
        const encodedFileName = encodeURIComponent(fileName);

        const blob = await apiClient.getBlob(
          `/api/download/${directory}/${encodedFileName}`,
        );

        downloadFileBlob(blob, fileName);
      } catch (error: unknown) {
        console.error("Error downloading file:", error);

        showToast("Error downloading file", "error");
      }
    },
    [currentDirectory, encodePath, downloadFileBlob, showToast],
  );

  const downloadFolder = useCallback(
    async (folderName: string): Promise<void> => {
      try {
        const directory = encodePath(currentDirectory);
        const encodedFolderName = encodeURIComponent(folderName);

        const blob = await apiClient.getBlob(
          `/api/download-folder/${directory}/${encodedFolderName}`,
        );

        downloadFileBlob(blob, `${folderName}.zip`);
      } catch (error: unknown) {
        console.error("Error downloading folder:", error);

        showToast("Error downloading folder", "error");
      }
    },
    [currentDirectory, encodePath, downloadFileBlob, showToast],
  );

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  const deleteFilesRequest = useCallback(
    async (
      fileNames: string[],
      directory: string,
    ): Promise<DeleteFilesResponse> => {
      return apiClient.post<DeleteFilesResponse>("/api/delete-files", {
        currentDirectory: directory,
        fileNames,
      });
    },
    [],
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
      if (!fileName || !newFileName) {
        showToast("Missing required fields", "error");
        return;
      }

      try {
        await apiClient.post("/api/rename-file", {
          filename: fileName,
          newFilename: newFileName,
          currentPath: currentDirectory || "/",
        });

        await changeDirectory(currentDirectory);

        showToast("File renamed", "success");
      } catch (error: unknown) {
        console.error("Error renaming file:", error);

        showToast("Error renaming file", "error");
      }
    },
    [currentDirectory, changeDirectory, showToast],
  );

  const shareFile = useCallback(
    async (fileName: string): Promise<void> => {
      try {
        await apiClient.post("/api/share", {
          fileName,
          filePath: currentDirectory,
        });

        showToast(
          "Link generated",
          "success",
          `Share link created for ${fileName}`,
        );
      } catch (error: unknown) {
        console.error("Error sharing file:", error);

        showToast(
          "Error generating link",
          "error",
          `Failed to generate link for ${fileName}`,
        );
      }
    },
    [currentDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

  const createFolder = useCallback(
    async (folderName: string): Promise<void> => {
      if (!folderName) {
        return;
      }

      try {
        await apiClient.post("/api/create-folder", {
          folderName,
          currentPath: currentDirectory,
        });

        await changeDirectory(currentDirectory);

        showToast("Folder created", "success");
      } catch (error: unknown) {
        console.error("Error creating folder:", error);

        showToast("Error creating folder", "error");
      }
    },
    [currentDirectory, changeDirectory, showToast],
  );

  const deleteFolder = useCallback(
    async (folderName: string): Promise<void> => {
      if (!folderName) {
        return;
      }

      try {
        await apiClient.post("/api/delete-folder", {
          folderName,
          folderPath: currentDirectory || "/",
        });

        await changeDirectory(currentDirectory);

        showToast("Folder deleted", "success");
      } catch (error: unknown) {
        console.error("Error deleting folder:", error);

        showToast("Error deleting folder", "error");
      }
    },
    [currentDirectory, changeDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard operations
  // ---------------------------------------------------------------------------

  const copyFile = useCallback(
    (fileName: string): void => {
      copyToClipboard({
        file: fileName,
        path: currentDirectory,
        source: "local",
      });
    },
    [copyToClipboard, currentDirectory],
  );

  const copyFolder = useCallback(
    (folderName: string): void => {
      copyToClipboard({
        file: folderName,
        path: currentDirectory,
        source: "local",
        isDirectory: true,
      });
    },
    [copyToClipboard, currentDirectory],
  );

  const cutFile = useCallback(
    (fileName: string): void => {
      cutToClipboard({
        file: fileName,
        path: currentDirectory,
        source: "local",
        serverId: null,
      });
    },
    [cutToClipboard, currentDirectory],
  );

  const paste = useCallback(async (): Promise<void> => {
    if (!clipboard.length) {
      return;
    }

    const destinationDirectory = currentDirectory;
    const items = [...clipboard];

    try {
      const { jobId } = await apiClient.post<PasteResponse>(
        "/api/paste-files",
        {
          files: items,
          newPath: destinationDirectory,
        },
      );

      clearClipboard();

      trackJob({
        jobId,
        items,

        onDone: () => {
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
    clearClipboard,
    trackJob,
    changeDirectory,
    showToast,
  ]);

  // ---------------------------------------------------------------------------
  // Breadcrumbs
  // ---------------------------------------------------------------------------

  const breadcrumbs = useMemo<BreadcrumbEntry[]>(() => {
    const result: BreadcrumbEntry[] = [
      {
        name: "Home",
        path: "",
      },
    ];

    if (!currentDirectory) {
      return result;
    }

    let breadcrumbPath = "";

    currentDirectory
      .split("/")
      .filter(Boolean)
      .forEach((part) => {
        breadcrumbPath = joinPath(breadcrumbPath, part);

        result.push({
          name: part,
          path: breadcrumbPath,
        });
      });

    return result;
  }, [currentDirectory]);

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
    error: null,
  };
}
