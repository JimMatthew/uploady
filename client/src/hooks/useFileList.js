import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";
import apiClient from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";
import { useTransferJob } from "../hooks/useTransferJob";

/**
 * @returns {import("../types/fileBrowser").FileBrowser}
 */
export function useFileList({ toast }) {
  const [files, setFileData] = useState(null);
  const [currentPath, setCurrentPath] = useState("files");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const { copyFile, clipboard, cutFile, clearClipboard } = useClipboard();

  const { progressMap, startedTransfers, trackJob } = useTransferJob({
    onError: () => showToast("Transfer connection lost", "error"),
  });

  const navigate = useNavigate();

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
  // ---------------------------------------------------------------------------
  // Core fetch
  // ---------------------------------------------------------------------------

  const fetchFiles = useCallback(
    async (path) => {
      try {
        const data = await apiClient.get(`/api/${path}/`);
        setFileData(data);
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          navigate("/");
          return;
        }

        console.error("Error fetching files:", err);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const reload = useCallback(() => {
    fetchFiles(currentPath);
  }, [fetchFiles, currentPath]);

  // ---------------------------------------------------------------------------
  // Auth + initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchFiles(currentPath);
  }, [currentPath, token]);

  // ---------------------------------------------------------------------------
  // Bound operations — curry current relativePath into each handler
  // so callers only need to pass the file/folder name
  // ---------------------------------------------------------------------------

  const downloadFile = useCallback(
    (name) => {
      const token = localStorage.getItem("token");
      window.location.href = `/api/download/${files?.relativePath}/${name}?token=${token}&t=${Date.now()}`;
    },
    [files?.relativePath],
  );

  const deleteFile = useCallback(
    async (name) => {
      try {
        await apiClient.post(`/api/delete/${files.relativePath}/${name}`, {
          fileName: name,
        });

        reload();
        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [files?.relativePath, reload, showToast],
  );

  const shareFile = useCallback(
    async (name) => {
      try {
        await apiClient.post("/api/share", {
          fileName: name,
          filePath: files?.relativePath,
        });

        reload();

        showToast(
          "Link generated",
          "success",
          `Share link created for ${name}`,
        );
      } catch {
        showToast(
          "Error generating link",
          "error",
          `Failed to generate link for ${name}`,
        );
      }
    },
    [files?.relativePath, reload, showToast],
  );

  const onFileCopy = useCallback(
    (name) => {
      copyFile({
        file: name,
        path: files?.relativePath,
        source: "local",
      });
    },
    [copyFile, files?.relativePath],
  );

  const onFileCut = useCallback(
    (name) => {
      cutFile({
        file: name,
        path: files?.relativePath,
        source: "local",
        serverId: null,
      });
    },
    [cutFile, files?.relativePath],
  );

  const renameFile = useCallback(
    async (name, newName) => {
      const path = files?.relativePath;

      if (!name || !newName || !path) {
        showToast("Missing required fields", "error");
        return;
      }

      try {
        await apiClient.post("/api/rename-file", {
          filename: name,
          newFilename: newName,
          currentPath: path,
        });

        reload();
        showToast("File renamed", "success");
      } catch {
        showToast("Error renaming file", "error");
      }
    },
    [files?.relativePath, reload, showToast],
  );

  const deleteFolder = useCallback(
    async (folder) => {
      try {
        await apiClient.post("/api/delete-folder", {
          folderName: folder,
          folderPath: files?.relativePath,
        });

        reload();
        showToast("Folder deleted", "success");
      } catch {
        showToast("Error deleting folder", "error");
      }
    },
    [files?.relativePath, reload, showToast],
  );

  const copyFolder = useCallback(
    (folder) => {
      copyFile({
        file: folder,
        path: files?.relativePath,
        source: "local",
        isDirectory: true,
      });
    },
    [copyFile, files?.relativePath],
  );

  const onPaste = useCallback(async () => {
    if (!clipboard.length) return;

    try {
      const items = [...clipboard];

      const { jobId } = await apiClient.post("/api/paste-files", {
        files: items,
        newPath: files?.relativePath,
      });

      clearClipboard();

      trackJob({
        jobId,
        items,
        onDone: reload,
      });
    } catch {
      showToast("Error pasting files", "error");
    }
  }, [
    clipboard,
    files?.relativePath,
    clearClipboard,
    trackJob,
    reload,
    showToast,
  ]);

  const createFolder = useCallback(
    async (folder) => {
      try {
        await apiClient.post("/api/create-folder", {
          folderName: folder,
          currentPath: files?.relativePath,
        });

        reload();
        showToast("Folder created", "success");
      } catch {
        showToast("Error creating folder", "error");
      }
    },
    [files?.relativePath, reload, showToast],
  );

  const generateBreadcrumb = useCallback(() => {
    const path = files?.relativePath;

    const breadcrumbs = [{ name: "Home", path: "files" }];

    let current = "files";

    path
      ?.split("/")
      .filter(Boolean)
      .forEach((part) => {
        current += `/${part}`;
        breadcrumbs.push({
          name: part,
          path: current,
        });
      });

    return breadcrumbs;
  }, [files?.relativePath]);

  const downloadFileBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => window.URL.revokeObjectURL(url), 5000);
  }, []);

  const downloadFolder = useCallback(
    async (folderName) => {
      try {
        const blob = await apiClient.getBlob(
          `/api/download-folder/${files?.relativePath}/${folderName}`,
        );

        downloadFileBlob(blob, `${folderName}.zip`);
      } catch {
        showToast("Error downloading folder", "error");
      }
    },
    [files?.relativePath, downloadFileBlob, showToast],
  );

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const openFolder = useCallback((folderName) => {
    setCurrentPath((prev) => joinPath(prev, folderName));
  }, []);

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    files,
    loading,

    openFolder,
    changeDirectory: setCurrentPath,
    reload,

    downloadFile,
    downloadFolder,
    deleteFile,
    renameFile,
    shareFile,

    copyFile: onFileCopy,
    cutFile: onFileCut,
    paste: onPaste,

    createFolder,
    deleteFolder,
    copyFolder,

    generateBreadcrumb,

    progressMap,
    startedTransfers,
  };
}
