import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useClipboard } from "../contexts/ClipboardContext";
import { useTransferJob } from "./useTransferJob";
import apiClient from "../services/apiClient";
import { joinPath } from "../utils/path";

const EMPTY_DIRECTORY = {
  currentDirectory: "/",
  files: [],
  folders: [],
};

/**
 * @returns {import("../types/fileBrowser").FileBrowser}
 */
export function useSftpFileFolderViewer({ serverId, toast }) {
  const [files, setFiles] = useState(EMPTY_DIRECTORY);
  const [loading, setLoading] = useState(true);

  const currentDirectoryRef = useRef("/");

  const showToast = useCallback(
    (title, status, description = null) => {
      toast({
        title,
        description,
        status,
        duration: 3000,
        isClosable: true,
      });
    },
    [toast],
  );

  const { progressMap, startedTransfers, trackJob } = useTransferJob({
    onError: () => showToast("Transfer connection lost", "error"),
  });

  const { copyFile, clipboard, clearClipboard, cutFile } = useClipboard();

  const currentDirectory = files?.currentDirectory ?? "/";

  useEffect(() => {
    currentDirectoryRef.current = currentDirectory;
  }, [currentDirectory]);

  // ---------------------------------------------------------------------------
  // Directory navigation
  // ---------------------------------------------------------------------------

  const connectToServer = useCallback(
    async (signal) => {
      const data = await apiClient.get(`/sftp/api/connect/${serverId}/`, {
        signal,
      });

      setFiles(data);
      return data;
    },
    [serverId],
  );

  const changeDirectory = useCallback(
    async (directory) => {
      try {
        const data = await apiClient.get(
          `/sftp/api/connect/${serverId}/${directory}/`,
        );

        setFiles(data);
        return data;
      } catch (error) {
        if (error.name !== "AbortError") {
          showToast("Error listing directory", "error");
        }

        return null;
      }
    },
    [serverId, showToast],
  );

  const openFolder = useCallback(
    (folder) => {
      return changeDirectory(joinPath(currentDirectory, folder));
    },
    [changeDirectory, currentDirectory],
  );

  const reload = useCallback(() => {
    return changeDirectory(currentDirectory);
  }, [changeDirectory, currentDirectory]);

  // ---------------------------------------------------------------------------
  // Initial connection
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setFiles(EMPTY_DIRECTORY);

    const connect = async () => {
      try {
        await connectToServer(controller.signal);
      } catch (error) {
        if (error.name !== "AbortError") {
          showToast("Error connecting to server", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    connect();

    return () => {
      controller.abort();
    };
  }, [connectToServer, showToast]);

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFileBlob = useCallback((blob, filename) => {
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
    (filename) => {
      const token = localStorage.getItem("token");

      const path = joinPath(
        "/sftp/api/download",
        serverId,
        currentDirectory,
        filename,
      );

      const params = new URLSearchParams({
        token,
        t: Date.now().toString(),
      });

      window.location.href = `${path}?${params}`;
    },
    [serverId, currentDirectory],
  );

  const downloadFolder = useCallback(
    async (folderName) => {
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

  const deleteFile = useCallback(
    async (filename) => {
      try {
        await apiClient.post("/sftp/api/delete-file", {
          currentDirectory,
          serverId,
          fileName: filename,
        });

        await changeDirectory(currentDirectory);

        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [serverId, currentDirectory, changeDirectory, showToast],
  );

  const renameFile = useCallback(
    async (filename, newFilename) => {
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
    async (filename) => {
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
    async (folder) => {
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
    async (folder) => {
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
    (filename) => {
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
    (folder) => {
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
    (filename) => {
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

  const handlePaste = useCallback(async () => {
    if (!clipboard.length) {
      return;
    }

    const destinationDirectory = currentDirectory;

    try {
      const items = [...clipboard];

      const { jobId } = await apiClient.post("/sftp/api/copy-files", {
        files: items,
        newPath: destinationDirectory,
        newServerId: serverId,
      });

      clearClipboard();

      trackJob({
        jobId,
        items,

        onDone: () => {
          // Don't pull the user back to the directory
          // where the transfer originally started.
          if (currentDirectoryRef.current === destinationDirectory) {
            changeDirectory(destinationDirectory);
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

  const breadcrumbs = useMemo(() => {
    const result = [
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
    files,
    loading,

    openFolder,
    changeDirectory,
    reload,

    downloadFile,
    downloadFolder,
    deleteFile,
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
  };
}
