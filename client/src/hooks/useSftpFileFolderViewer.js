import { useState, useEffect, useCallback } from "react";
import { useClipboard } from "../contexts/ClipboardContext";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";
import apiClient from "../services/apiClient";
import { useTransferJob } from "./useTransferJob";

/**
 * @returns {import("../types/fileBrowser").FileBrowser}
 */
export function useSftpFileFolderViewer({ serverId, toast }) {
  const [files, setFiles] = useState([{}]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const { progressMap, startedTransfers, trackJob } = useTransferJob({
    onError: () => showToast("Transfer connection lost", "error"),
  });
  const { copyFile, clipboard, clearClipboard, cutFile } = useClipboard();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const showToast = useCallback(
    (title, status, description = null) => {
      toast({ title, description, status, duration: 3000, isClosable: true });
    },
    [toast],
  );

  // ---------------------------------------------------------------------------
  // Directory navigation
  // ---------------------------------------------------------------------------

  const connectToServer = useCallback(async () => {
    try {
      const data = await apiClient.get(`/sftp/api/connect/${serverId}/`);
      setFiles(data);
    } catch {
      showToast("Error connecting to server", "error");
    }
  }, [serverId, showToast]);

  const changeDirectory = useCallback(
    async (directory) => {
      try {
        const data = await apiClient.get(
          `/sftp/api/connect/${serverId}/${directory}/`,
        );
        setFiles(data);
      } catch {
        showToast("Error listing directory", "error");
      }
    },
    [serverId, showToast],
  );

  const onChangeDirectory = useCallback(
    (folder) => changeDirectory(joinPath(files.currentDirectory, folder)),
    [changeDirectory, files?.currentDirectory],
  );

  const reload = useCallback(
    () => changeDirectory(files.currentDirectory),
    [changeDirectory, files?.currentDirectory],
  );

  // ---------------------------------------------------------------------------
  // Initial connection
  // Cleanup flag prevents stale connection from marking a new serverId
  // as connected if serverId changes while a connection is in flight
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    setConnected(false);
    setLoading(true);

    connectToServer().then(() => {
      if (!cancelled) {
        setConnected(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  const downloadFileBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Delay revoke — a.click() is async and revoking immediately
    // can cancel the download before it starts on larger files
    setTimeout(() => window.URL.revokeObjectURL(url), 5000);
  }, []);

  const downloadFile = useCallback(
    (filename) => {
      const token = localStorage.getItem("token");
      window.location.href = `/sftp/api/download/${serverId}/${files.currentDirectory}/${filename}?token=${token}&t=${Date.now()}`;
    },
    [serverId, files?.currentDirectory],
  );

  const downloadFolder = useCallback(
    async (foldername) => {
      try {
        const folder = `${files.currentDirectory}/${foldername}`;
        const blob = await apiClient.getBlob(
          `/sftp/api/download-folder/${serverId}/${folder}`,
        );
        downloadFileBlob(blob, `${foldername}.zip`);
        showToast("Folder downloaded", "success");
      } catch {
        showToast("Error downloading folder", "error");
      }
    },
    [serverId, files?.currentDirectory, downloadFileBlob, showToast],
  );

  const deleteFile = useCallback(
    async (filename) => {
      try {
        await apiClient.post("/sftp/api/delete-file", {
          currentDirectory: files.currentDirectory,
          serverId,
          fileName: filename,
        });
        await changeDirectory(files.currentDirectory);
        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [serverId, files?.currentDirectory, changeDirectory, showToast],
  );

  const renameFile = useCallback(
    async (filename, newfilename) => {
      try {
        await apiClient.post("/sftp/api/renameFile", {
          currentPath: files.currentDirectory,
          fileName: filename,
          newFileName: newfilename,
          serverId,
        });
        await changeDirectory(files.currentDirectory);
        showToast("File renamed", "success");
      } catch {
        showToast("Error renaming file", "error");
      }
    },
    [serverId, files?.currentDirectory, changeDirectory, showToast],
  );

  const shareFile = useCallback(
    async (filename) => {
      const remotePath = `${files.currentDirectory}/${filename}`;
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
    [serverId, files?.currentDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

  const deleteFolder = useCallback(
    async (folder) => {
      try {
        await apiClient.post("/sftp/api/delete-folder", {
          currentDirectory: files.currentDirectory,
          serverId,
          deleteDir: folder,
        });
        await changeDirectory(files.currentDirectory);
        showToast("Folder deleted", "success");
      } catch {
        showToast("Error deleting folder", "error");
      }
    },
    [serverId, files?.currentDirectory, changeDirectory, showToast],
  );

  const createFolder = useCallback(
    async (folder) => {
      try {
        await apiClient.post("/sftp/api/create-folder", {
          currentPath: files.currentDirectory,
          serverId,
          folderName: folder,
        });
        await changeDirectory(files.currentDirectory);
        showToast("Folder created", "success");
      } catch {
        showToast("Error creating folder", "error");
      }
    },
    [serverId, files?.currentDirectory, changeDirectory, showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  const handleCopy = useCallback(
    (filename, isFolder = false) => {
      copyFile({
        file: filename,
        path: files.currentDirectory,
        source: "sftp",
        serverId,
        isDirectory: isFolder,
      });
    },
    [copyFile, files?.currentDirectory, serverId],
  );

  const copyFolder = useCallback(
    (folder) => handleCopy(folder, true),
    [handleCopy],
  );

  const handlePaste = async () => {
    if (!clipboard.length) return;

    try {
      const items = [...clipboard];

      const { jobId } = await apiClient.post("/sftp/api/copy-files", {
        files: items,
        newPath: files.currentDirectory,
        newServerId: serverId,
      });

      clearClipboard();

      trackJob({
        jobId,
        items,
        onDone: () => changeDirectory(files.currentDirectory),
      });
    } catch {
      showToast("Error pasting files", "error");
    }
  };

  const handleCut = useCallback(
    (filename) => {
      cutFile({
        file: filename,
        path: files.currentDirectory,
        source: "sftp",
        serverId,
      });
    },
    [cutFile, files?.currentDirectory, serverId],
  );

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  const generateBreadcrumb = useCallback((path) => {
    if (!path) return [{ name: "Home", path: "/" }];
    let currentPath = "";
    const crumbs = path
      .split("/")
      .filter(Boolean)
      .map((part) => {
        currentPath += `/${part}`;
        return { name: part, path: currentPath };
      });
    return [{ name: "Home", path: "/" }, ...crumbs];
  }, []);

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    files,
    loading,

    openFolder: onChangeDirectory,
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

    generateBreadcrumb,

    progressMap,
    startedTransfers,
  };
}
