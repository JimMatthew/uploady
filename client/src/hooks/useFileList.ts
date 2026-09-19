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
  relativePath?: string | null;
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

export function useFileList({ toast }: UseFileListOptions): FileBrowser {
  const [files, setFiles] = useState<LocalDirectoryResponse | null>(null);
  const [directoryRoute, setDirectoryRoute] = useState("files");
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);

  const navigate = useNavigate();

  const {
    copyFile: copyToClipboard,
    cutFile: cutToClipboard,
    clipboard,
    clearClipboard,
  } = useClipboard();

  const currentDirectory = files?.relativePath ?? null;

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

  const fetchDirectory = useCallback(
    async (directory: string): Promise<void> => {
      const requestId = ++requestIdRef.current;

      try {
        const data = await apiClient.get<LocalDirectoryResponse>(
          `/api/${encodePath(directory)}/`,
        );

        // Ignore responses belonging to an older navigation request.
        if (requestId !== requestIdRef.current) {
          return;
        }

        setFiles(data);
      } catch (error: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const status = error instanceof ApiError ? error.status : undefined;

        if (status === 401 || status === 403) {
          navigate("/");
          return;
        }

        console.error("Error fetching files:", error);

        showToast("Error loading files", "error");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [encodePath, navigate, showToast],
  );

  const reload = useCallback((): Promise<void> => {
    return fetchDirectory(directoryRoute);
  }, [fetchDirectory, directoryRoute]);

  // ---------------------------------------------------------------------------
  // Authentication + initial directory loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    void fetchDirectory(directoryRoute);
  }, [directoryRoute, fetchDirectory, navigate]);

  // ---------------------------------------------------------------------------
  // Directory navigation
  // ---------------------------------------------------------------------------

  const openFolder = useCallback((folderName: string): void => {
    setDirectoryRoute((previousDirectory) =>
      joinPath(previousDirectory, folderName),
    );
  }, []);

  const changeDirectory = useCallback((directory: string): void => {
    setDirectoryRoute(directory);
  }, []);

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFile = useCallback(
    async (fileName: string): Promise<void> => {
      if (currentDirectory == null) {
        return;
      }

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
      if (currentDirectory == null) {
        return;
      }

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
      if (currentDirectory == null) {
        return;
      }

      const deleteDirectory = currentDirectory;

      try {
        const { results } = await deleteFilesRequest(
          [fileName],
          deleteDirectory,
        );

        if (currentDirectory === deleteDirectory) {
          await reload();
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
    [currentDirectory, deleteFilesRequest, reload, showToast],
  );

  const deleteFiles = useCallback(
    async (fileNames: string[]): Promise<void> => {
      if (currentDirectory == null || fileNames.length === 0) {
        return;
      }

      const deleteDirectory = currentDirectory;

      try {
        const { results } = await deleteFilesRequest(
          fileNames,
          deleteDirectory,
        );

        if (currentDirectory === deleteDirectory) {
          await reload();
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
    [currentDirectory, deleteFilesRequest, reload, showToast],
  );

  const renameFile = useCallback(
    async (fileName: string, newFileName: string): Promise<void> => {
      if (!fileName || !newFileName || currentDirectory == null) {
        showToast("Missing required fields", "error");
        return;
      }

      try {
        await apiClient.post("/api/rename-file", {
          filename: fileName,
          newFilename: newFileName,
          currentPath: currentDirectory || "/",
        });

        await reload();

        showToast("File renamed", "success");
      } catch (error: unknown) {
        console.error("Error renaming file:", error);

        showToast("Error renaming file", "error");
      }
    },
    [currentDirectory, reload, showToast],
  );

  const shareFile = useCallback(
    async (fileName: string): Promise<void> => {
      if (currentDirectory == null) {
        return;
      }

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
      if (!folderName || currentDirectory == null) {
        return;
      }

      try {
        await apiClient.post("/api/create-folder", {
          folderName,
          currentPath: currentDirectory,
        });

        await reload();

        showToast("Folder created", "success");
      } catch (error: unknown) {
        console.error("Error creating folder:", error);

        showToast("Error creating folder", "error");
      }
    },
    [currentDirectory, reload, showToast],
  );

  const deleteFolder = useCallback(
    async (folderName: string): Promise<void> => {
      if (!folderName || currentDirectory == null) {
        return;
      }

      try {
        await apiClient.post("/api/delete-folder", {
          folderName,
          folderPath: currentDirectory || "/",
        });

        await reload();

        showToast("Folder deleted", "success");
      } catch (error: unknown) {
        console.error("Error deleting folder:", error);

        showToast("Error deleting folder", "error");
      }
    },
    [currentDirectory, reload, showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard operations
  // ---------------------------------------------------------------------------

  const copyFile = useCallback(
    (fileName: string): void => {
      if (currentDirectory == null) {
        return;
      }

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
      if (currentDirectory == null) {
        return;
      }

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
      if (currentDirectory == null) {
        return;
      }

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
    if (!clipboard.length || currentDirectory == null) {
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
          void reload();
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
    reload,
    showToast,
  ]);

  // ---------------------------------------------------------------------------
  // Breadcrumbs
  // ---------------------------------------------------------------------------

  const breadcrumbs = useMemo<BreadcrumbEntry[]>(() => {
    const result: BreadcrumbEntry[] = [
      {
        name: "Home",
        path: "files",
      },
    ];

    if (!currentDirectory) {
      return result;
    }

    let breadcrumbPath = "files";

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
      files: files?.files ?? [],
      folders: files?.folders ?? [],
    },

    loading,

    currentPath: currentDirectory ?? "",

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
