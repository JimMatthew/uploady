import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";
import apiClient from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";
import { useTransferJob } from "../hooks/useTransferJob";

export function useFileList({ toast }) {
  const [fileData, setFileData] = useState(null);
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

  const onFileDownload = useCallback(
    (name) => {
      const token = localStorage.getItem("token");
      window.location.href = `/api/download/${fileData?.relativePath}/${name}?token=${token}&t=${Date.now()}`;
    },
    [fileData?.relativePath],
  );

  const onFileDelete = useCallback(
    async (name) => {
      try {
        await apiClient.post(`/api/delete/${fileData.relativePath}/${name}`, {
          fileName: name,
        });

        reload();
        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [fileData?.relativePath, reload, showToast],
  );

  const onFileShare = useCallback(
    async (name) => {
      try {
        await apiClient.post("/api/share", {
          fileName: name,
          filePath: fileData?.relativePath,
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
    [fileData?.relativePath, reload, showToast],
  );

  const onFileCopy = useCallback(
    (name) => {
      copyFile({
        file: name,
        path: fileData?.relativePath,
        source: "local",
      });
    },
    [copyFile, fileData?.relativePath],
  );

  const onFileCut = useCallback(
    (name) => {
      cutFile({
        file: name,
        path: fileData?.relativePath,
        source: "local",
        serverId: null,
      });
    },
    [cutFile, fileData?.relativePath],
  );

  const onFileRename = useCallback(
    async (name, newName) => {
      const path = fileData?.relativePath;

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
    [fileData?.relativePath, reload, showToast],
  );

  const onFolderDelete = useCallback(
    async (folder) => {
      try {
        await apiClient.post("/api/delete-folder", {
          folderName: folder,
          folderPath: fileData?.relativePath,
        });

        reload();
        showToast("Folder deleted", "success");
      } catch {
        showToast("Error deleting folder", "error");
      }
    },
    [fileData?.relativePath, reload, showToast],
  );

  const onFolderCopy = useCallback(
    (folder) => {
      copyFile({
        file: folder,
        path: fileData?.relativePath,
        source: "local",
        isDirectory: true,
      });
    },
    [copyFile, fileData?.relativePath],
  );

  const onPaste = useCallback(async () => {
    if (!clipboard.length) return;

    try {
      const items = [...clipboard];

      const { jobId } = await apiClient.post("/api/paste-files", {
        files: items,
        newPath: fileData?.relativePath,
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
    fileData?.relativePath,
    clearClipboard,
    trackJob,
    reload,
    showToast,
  ]);

  const onCreateFolder = useCallback(
    async (folder) => {
      try {
        await apiClient.post("/api/create-folder", {
          folderName: folder,
          currentPath: fileData?.relativePath,
        });

        reload();
        showToast("Folder created", "success");
      } catch {
        showToast("Error creating folder", "error");
      }
    },
    [fileData?.relativePath, reload, showToast],
  );

  const onGenerateBreadcrumb = useCallback(() => {
    const path = fileData?.relativePath;

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
  }, [fileData?.relativePath]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleFolderClick = useCallback((folderName) => {
    setCurrentPath((prev) => joinPath(prev, folderName));
  }, []);

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    fileData,
    loading,
    setCurrentPath,
    handleFolderClick,
    reload,
    onCreateFolder,
    onFileCopy,
    onFileCut,
    onFileDelete,
    onFileDownload,
    onFileRename,
    onFileShare,
    onFolderCopy,
    onFolderDelete,
    onPaste,
    onGenerateBreadcrumb,
    progressMap,
    startedTransfers,
  };
}
