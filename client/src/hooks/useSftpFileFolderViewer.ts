import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClipboard, type ClipboardItem } from "../contexts/ClipboardContext";
import { useTransferJob } from "./useTransferJob";
import apiClient from "../services/apiClient";
import { joinPath } from "../utils/path";

import type {
  BreadcrumbEntry,
  FileBrowser,
  FileListing,
} from "../types/fileBrowser";

import type { AppToast } from "./useAppToast";

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
  const currentDirectoryRef = useRef("/");
  const [error, setError] = useState<string | null>(null);
  const showToast = useCallback(
    (
      title: string,
      status: "error" | "success" | "warning" | "info",
      description?: string,
    ): void => {
      toast({
        title,
        description,
        status,
        duration: 3000,
      });
    },
    [toast],
  );

  const { progressMap, startedTransfers, trackJob } = useTransferJob({
    onError: () => showToast("Transfer connection lost", "error"),
  });

  const { copyFile, clipboard, clearClipboard, cutFile } = useClipboard();

  const currentDirectory = files.currentDirectory ?? "/";

  useEffect(() => {
    currentDirectoryRef.current = currentDirectory;
  }, [currentDirectory]);

  // ---------------------------------------------------------------------------
  // Directory navigation
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

  const openFolder = useCallback(
    (folder: string): Promise<SftpDirectoryResponse | null> => {
      return changeDirectory(joinPath(currentDirectory, folder));
    },
    [changeDirectory, currentDirectory],
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
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFileBlob = useCallback((blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
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
    (filename: string): void => {
      const token = localStorage.getItem("token");

      const path = joinPath(
        "/sftp/api/download",
        serverId,
        currentDirectory,
        filename,
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
      } catch {
        showToast("Error downloading folder", "error");
      }
    },
    [serverId, currentDirectory, downloadFileBlob, showToast],
  );

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------
  const deleteFileRequest = useCallback(
    async (filename: string, directory: string): Promise<void> => {
      await apiClient.post("/sftp/api/delete-file", {
        currentDirectory: directory,
        serverId,
        fileName: filename,
      });
    },
    [serverId],
  );

  const deleteFile = useCallback(
    async (filename: string): Promise<void> => {
      const deleteDirectory = currentDirectory;

      try {
        await deleteFileRequest(filename, deleteDirectory);

        if (currentDirectoryRef.current === deleteDirectory) {
          await changeDirectory(deleteDirectory);
        }

        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [currentDirectory, deleteFileRequest, changeDirectory, showToast],
  );

  const deleteFiles = useCallback(
    async (filenames: string[]): Promise<void> => {
      if (filenames.length === 0) {
        return;
      }

      const deleteDirectory = currentDirectory;

      try {
        await Promise.all(
          filenames.map((filename) =>
            deleteFileRequest(filename, deleteDirectory),
          ),
        );

        if (currentDirectoryRef.current === deleteDirectory) {
          await changeDirectory(deleteDirectory);
        }

        showToast(
          filenames.length === 1 ? "File deleted" : "Files deleted",
          "success",
        );
      } catch {
        showToast("Error deleting files", "error");
      }
    },
    [currentDirectory, deleteFileRequest, changeDirectory, showToast],
  );

  const renameFile = useCallback(
    async (filename: string, newFilename: string): Promise<void> => {
      try {
        await apiClient.post("/sftp/api/renameFile", {
          currentPath: currentDirectory,
          fileName: filename,
          newFileName: newFilename,
          serverId,
        });

        await changeDirectory(currentDirectory);

        showToast("File renamed", "success");
      } catch {
        showToast("Error renaming file", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  const shareFile = useCallback(
    async (filename: string): Promise<void> => {
      const remotePath = joinPath(currentDirectory, filename);

      try {
        await apiClient.post("/sftp/api/sharefile", {
          serverId,
          remotePath,
        });

        showToast("File shared", "success");
      } catch {
        showToast("Error sharing file", "error");
      }
    },
    [serverId, currentDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

  const deleteFolder = useCallback(
    async (folder: string): Promise<void> => {
      try {
        await apiClient.post("/sftp/api/delete-folder", {
          currentDirectory,
          serverId,
          deleteDir: folder,
        });

        await changeDirectory(currentDirectory);

        showToast("Folder deleted", "success");
      } catch {
        showToast("Error deleting folder", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  const createFolder = useCallback(
    async (folder: string): Promise<void> => {
      try {
        await apiClient.post("/sftp/api/create-folder", {
          currentPath: currentDirectory,
          serverId,
          folderName: folder,
        });

        await changeDirectory(currentDirectory);

        showToast("Folder created", "success");
      } catch {
        showToast("Error creating folder", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  const handleCopy = useCallback(
    (filename: string): void => {
      copyFile({
        file: filename,
        path: currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: false,
      });
    },
    [copyFile, currentDirectory, serverId],
  );

  const copyFolder = useCallback(
    (folder: string): void => {
      copyFile({
        file: folder,
        path: currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: true,
      });
    },
    [copyFile, currentDirectory, serverId],
  );

  const handleCut = useCallback(
    (filename: string): void => {
      cutFile({
        file: filename,
        path: currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: false,
      });
    },
    [cutFile, currentDirectory, serverId],
  );

  const handlePaste = useCallback(async (): Promise<void> => {
    if (!clipboard.length) {
      return;
    }

    const destinationDirectory = currentDirectory;

    try {
      const items: ClipboardItem[] = [...clipboard];

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
    } catch {
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

  const breadcrumbs = useMemo<BreadcrumbEntry[]>(() => {
    const result: BreadcrumbEntry[] = [
      {
        name: "Home",
        path: "/",
      },
    ];

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

    copyFile: handleCopy,
    cutFile: handleCut,
    paste: handlePaste,

    createFolder,
    deleteFolder,
    copyFolder,

    breadcrumbs,

    progressMap,
    startedTransfers,
    error,
  };
}
