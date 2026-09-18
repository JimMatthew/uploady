import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";
import apiClient, { ApiError } from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";
import { useTransferJob } from "../hooks/useTransferJob";
import type { AppToast, AppToastDetail, AppToastStatus } from "./useAppToast";

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

export function useFileList({ toast }: UseFileListOptions): FileBrowser {
  const [files, setFiles] = useState<LocalDirectoryResponse | null>(null);
  const [currentPath, setCurrentPath] = useState("files");
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const navigate = useNavigate();

  const {
    copyFile: copyToClipboard,
    cutFile: cutToClipboard,
    clipboard,
    clearClipboard,
  } = useClipboard();

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  interface ShowToastOptions {
    persistent?: boolean;
    details?: AppToastDetail[];
  }

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
        ...(description !== undefined ? { description } : {}),
        ...(options?.persistent !== undefined
          ? { persistent: options.persistent }
          : {}),
        ...(options?.details !== undefined ? { details: options.details } : {}),
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

  const relativePath = files?.relativePath ?? null;

  const downloadBlob = useCallback((blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  }, []);

  const encodePath = useCallback((path: string): string => {
    return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  }, []);

  // ---------------------------------------------------------------------------
  // File loading
  // ---------------------------------------------------------------------------

  const fetchFiles = useCallback(
    async (path: string): Promise<void> => {
      const requestId = ++requestIdRef.current;

      try {
        const data = await apiClient.get<LocalDirectoryResponse>(
          `/api/${encodePath(path)}/`,
        );

        // Ignore responses belonging
        // to an older navigation request.
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
    return fetchFiles(currentPath);
  }, [fetchFiles, currentPath]);

  // ---------------------------------------------------------------------------
  // Authentication + directory loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    void fetchFiles(currentPath);
  }, [currentPath, fetchFiles, navigate]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const openFolder = useCallback((folderName: string): void => {
    setCurrentPath((previousPath) => joinPath(previousPath, folderName));
  }, []);

  const changeDirectory = useCallback((path: string): void => {
    setCurrentPath(path);
  }, []);

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFile = useCallback(
    async (name: string): Promise<void> => {
      if (relativePath == null) {
        return;
      }

      try {
        const path = encodePath(relativePath);
        const filename = encodeURIComponent(name);

        const blob = await apiClient.getBlob(
          `/api/download/${path}/${filename}`,
        );

        downloadBlob(blob, name);
      } catch (error: unknown) {
        console.error("Error downloading file:", error);

        showToast("Error downloading file", "error");
      }
    },
    [relativePath, encodePath, downloadBlob, showToast],
  );

  const downloadFolder = useCallback(
    async (folderName: string): Promise<void> => {
      if (relativePath == null) {
        return;
      }

      try {
        const path = encodePath(relativePath);
        const folder = encodeURIComponent(folderName);

        const blob = await apiClient.getBlob(
          `/api/download-folder/${path}/${folder}`,
        );

        downloadBlob(blob, `${folderName}.zip`);
      } catch (error: unknown) {
        console.error("Error downloading folder:", error);

        showToast("Error downloading folder", "error");
      }
    },
    [relativePath, encodePath, downloadBlob, showToast],
  );

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  interface DeleteFileResult {
    path: string;
    success: boolean;
    error?: string;
  }
  interface DeleteFilesResponse {
    results: DeleteFileResult[];
  }

  const deleteFilesRequest = useCallback(
    async (
      names: string[],
      directory: string,
    ): Promise<DeleteFilesResponse> => {
      const response = await apiClient.post<DeleteFilesResponse>(
        "/api/delete-files",
        {
          currentDirectory: directory,
          fileNames: names,
        },
      );

      return response;
    },
    [],
  );

  const deleteFile = useCallback(
    async (name: string): Promise<void> => {
      if (relativePath == null) {
        return;
      }

      const deleteDirectory = relativePath;

      try {
        await deleteFilesRequest([name], deleteDirectory);

        if (relativePath === deleteDirectory) {
          await reload();
        }

        showToast("File deleted", "success");
      } catch (error: unknown) {
        console.error("Error deleting file:", error);
        showToast("Error deleting file", "error");
      }
    },
    [relativePath, deleteFilesRequest, reload, showToast],
  );

  const deleteFiles = useCallback(
    async (names: string[]): Promise<void> => {
      if (relativePath == null || names.length === 0) {
        return;
      }

      const deleteDirectory = relativePath;

      try {
        const { results } = await deleteFilesRequest(names, deleteDirectory);

        if (relativePath === deleteDirectory) {
          await reload();
        }

        const succeeded = results.filter((result) => result.success).length;

        const failedResults = results.filter((result) => !result.success);

        const failed = failedResults.length;

        if (failed === 0) {
          showToast(
            names.length === 1 ? "File deleted" : `${succeeded} files deleted`,
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
    [relativePath, deleteFilesRequest, reload, showToast],
  );
  const renameFile = useCallback(
    async (name: string, newName: string): Promise<void> => {
      if (!name || !newName || relativePath == null) {
        showToast("Missing required fields", "error");

        return;
      }

      try {
        await apiClient.post("/api/rename-file", {
          filename: name,
          newFilename: newName,
          currentPath: relativePath || "/",
        });

        await reload();

        showToast("File renamed", "success");
      } catch (error: unknown) {
        console.error("Error renaming file:", error);

        showToast("Error renaming file", "error");
      }
    },
    [relativePath, reload, showToast],
  );

  const shareFile = useCallback(
    async (name: string): Promise<void> => {
      if (relativePath == null) {
        return;
      }

      try {
        await apiClient.post("/api/share", {
          fileName: name,
          filePath: relativePath,
        });

        showToast(
          "Link generated",
          "success",
          `Share link created for ${name}`,
        );
      } catch (error: unknown) {
        console.error("Error sharing file:", error);

        showToast(
          "Error generating link",
          "error",
          `Failed to generate link for ${name}`,
        );
      }
    },
    [relativePath, showToast],
  );

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

  const createFolder = useCallback(
    async (folderName: string): Promise<void> => {
      if (!folderName || relativePath == null) {
        return;
      }

      try {
        await apiClient.post("/api/create-folder", {
          folderName,
          currentPath: relativePath,
        });

        await reload();

        showToast("Folder created", "success");
      } catch (error: unknown) {
        console.error("Error creating folder:", error);

        showToast("Error creating folder", "error");
      }
    },
    [relativePath, reload, showToast],
  );

  const deleteFolder = useCallback(
    async (folderName: string): Promise<void> => {
      if (!folderName || relativePath == null) {
        return;
      }

      try {
        await apiClient.post("/api/delete-folder", {
          folderName,
          folderPath: relativePath || "/",
        });

        await reload();

        showToast("Folder deleted", "success");
      } catch (error: unknown) {
        console.error("Error deleting folder:", error);

        showToast("Error deleting folder", "error");
      }
    },
    [relativePath, reload, showToast],
  );
  // ---------------------------------------------------------------------------
  // Clipboard operations
  // ---------------------------------------------------------------------------

  const copyFile = useCallback(
    (name: string): void => {
      if (relativePath == null) {
        return;
      }

      copyToClipboard({
        file: name,
        path: relativePath,
        source: "local",
      });
    },
    [copyToClipboard, relativePath],
  );

  const copyFolder = useCallback(
    (folderName: string): void => {
      if (relativePath == null) {
        return;
      }

      copyToClipboard({
        file: folderName,
        path: relativePath,
        source: "local",
        isDirectory: true,
      });
    },
    [copyToClipboard, relativePath],
  );

  const cutFile = useCallback(
    (name: string): void => {
      if (relativePath == null) {
        return;
      }

      cutToClipboard({
        file: name,
        path: relativePath,
        source: "local",
        serverId: null,
      });
    },
    [cutToClipboard, relativePath],
  );

  const paste = useCallback(async (): Promise<void> => {
    if (!clipboard.length || relativePath == null) {
      return;
    }

    const items = [...clipboard];

    try {
      const { jobId } = await apiClient.post<PasteResponse>(
        "/api/paste-files",
        {
          files: items,
          newPath: relativePath,
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
  }, [clipboard, relativePath, clearClipboard, trackJob, reload, showToast]);

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

    if (!relativePath) {
      return result;
    }

    let current = "files";

    relativePath
      .split("/")
      .filter(Boolean)
      .forEach((part) => {
        current = joinPath(current, part);

        result.push({
          name: part,
          path: current,
        });
      });

    return result;
  }, [relativePath]);

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    files: {
      files: files?.files ?? [],
      folders: files?.folders ?? [],
    },
    loading,

    currentPath: relativePath ?? "",
    openFolder,
    changeDirectory,
    reload,

    downloadFile,
    deleteFiles,
    downloadFolder,

    deleteFile,
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
