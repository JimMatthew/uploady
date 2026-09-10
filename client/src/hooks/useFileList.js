import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";
import apiClient from "../services/apiClient";
import { useClipboard } from "../contexts/ClipboardContext";
import { useTransferJob } from "../hooks/useTransferJob";

/**
 * Handles local file-browser data, navigation, filesystem operations,
 * clipboard operations, and transfer tracking.
 *
 * @param {{ toast: Function }} props
 * @returns {import("../types/fileBrowser").FileBrowser}
 */
export function useFileList({ toast }) {
  const [files, setFiles] = useState(null);
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

  const downloadBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  }, []);

  const encodePath = useCallback((path) => {
    return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  }, []);

  // ---------------------------------------------------------------------------
  // File loading
  // ---------------------------------------------------------------------------

  const fetchFiles = useCallback(
    async (path) => {
      const requestId = ++requestIdRef.current;

      try {
        const data = await apiClient.get(`/api/${encodePath(path)}/`);

        // Ignore responses belonging to an older navigation request.
        if (requestId !== requestIdRef.current) {
          return;
        }

        setFiles(data);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const status = err?.status ?? err?.response?.status;

        if (status === 401 || status === 403) {
          navigate("/");
          return;
        }

        console.error("Error fetching files:", err);
        showToast("Error loading files", "error");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [encodePath, navigate, showToast],
  );

  const reload = useCallback(() => {
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

    fetchFiles(currentPath);
  }, [currentPath, fetchFiles, navigate]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const openFolder = useCallback((folderName) => {
    setCurrentPath((previousPath) => joinPath(previousPath, folderName));
  }, []);

  const changeDirectory = useCallback((path) => {
    setCurrentPath(path);
  }, []);

  // ---------------------------------------------------------------------------
  // Downloads
  // ---------------------------------------------------------------------------

  const downloadFile = useCallback(
    async (name) => {
      if (!relativePath) {
        return;
      }

      try {
        const path = encodePath(relativePath);
        const filename = encodeURIComponent(name);

        const blob = await apiClient.getBlob(
          `/api/download/${path}/${filename}`,
        );

        downloadBlob(blob, name);
      } catch (err) {
        console.error("Error downloading file:", err);
        showToast("Error downloading file", "error");
      }
    },
    [relativePath, encodePath, downloadBlob, showToast],
  );

  const downloadFolder = useCallback(
    async (folderName) => {
      if (!relativePath) {
        return;
      }

      try {
        const path = encodePath(relativePath);
        const folder = encodeURIComponent(folderName);

        const blob = await apiClient.getBlob(
          `/api/download-folder/${path}/${folder}`,
        );

        downloadBlob(blob, `${folderName}.zip`);
      } catch (err) {
        console.error("Error downloading folder:", err);
        showToast("Error downloading folder", "error");
      }
    },
    [relativePath, encodePath, downloadBlob, showToast],
  );

  // ---------------------------------------------------------------------------
  // File operations
  // ---------------------------------------------------------------------------

  const deleteFile = useCallback(
    async (name) => {
      if (!relativePath) {
        return;
      }

      try {
        const path = encodePath(relativePath);
        const filename = encodeURIComponent(name);

        await apiClient.post(`/api/delete/${path}/${filename}`, {
          fileName: name,
        });

        await reload();
        showToast("File deleted", "success");
      } catch (err) {
        console.error("Error deleting file:", err);
        showToast("Error deleting file", "error");
      }
    },
    [relativePath, encodePath, reload, showToast],
  );

  const renameFile = useCallback(
    async (name, newName) => {
      if (!name || !newName || !relativePath) {
        showToast("Missing required fields", "error");
        return;
      }

      try {
        await apiClient.post("/api/rename-file", {
          filename: name,
          newFilename: newName,
          currentPath: relativePath,
        });

        await reload();
        showToast("File renamed", "success");
      } catch (err) {
        console.error("Error renaming file:", err);
        showToast("Error renaming file", "error");
      }
    },
    [relativePath, reload, showToast],
  );

  const shareFile = useCallback(
    async (name) => {
      if (!relativePath) {
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
      } catch (err) {
        console.error("Error sharing file:", err);

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
    async (folderName) => {
      if (!folderName || !relativePath) {
        return;
      }

      try {
        await apiClient.post("/api/create-folder", {
          folderName,
          currentPath: relativePath,
        });

        await reload();
        showToast("Folder created", "success");
      } catch (err) {
        console.error("Error creating folder:", err);
        showToast("Error creating folder", "error");
      }
    },
    [relativePath, reload, showToast],
  );

  const deleteFolder = useCallback(
    async (folderName) => {
      if (!folderName || !relativePath) {
        return;
      }

      try {
        await apiClient.post("/api/delete-folder", {
          folderName,
          folderPath: relativePath,
        });

        await reload();
        showToast("Folder deleted", "success");
      } catch (err) {
        console.error("Error deleting folder:", err);
        showToast("Error deleting folder", "error");
      }
    },
    [relativePath, reload, showToast],
  );

  // ---------------------------------------------------------------------------
  // Clipboard operations
  // ---------------------------------------------------------------------------

  const copyFile = useCallback(
    (name) => {
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
    (folderName) => {
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
    (name) => {
      if (!relativePath) {
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

  const paste = useCallback(async () => {
    if (!clipboard.length || !relativePath) {
      return;
    }

    const items = [...clipboard];

    try {
      const { jobId } = await apiClient.post("/api/paste-files", {
        files: items,
        newPath: relativePath,
      });

      clearClipboard();

      trackJob({
        jobId,
        items,
        onDone: reload,
      });
    } catch (err) {
      console.error("Error pasting files:", err);
      showToast("Error pasting files", "error");
    }
  }, [clipboard, relativePath, clearClipboard, trackJob, reload, showToast]);

  // ---------------------------------------------------------------------------
  // Breadcrumbs
  // ---------------------------------------------------------------------------

  const breadcrumbs = useMemo(() => {
    const result = [{ name: "Home", path: "files" }];

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
    files,
    loading,

    currentPath,
    openFolder,
    changeDirectory,
    reload,

    downloadFile,
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
  };
}
