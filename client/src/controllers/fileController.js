import { useClipboard } from "../contexts/ClipboardContext";
import { useState, useEffect, useCallback } from "react";
const FileController = ({ toast, onRefresh }) => {
  const token = localStorage.getItem("token");
  const { copyFile, clipboard, cutFile, clearClipboard } = useClipboard();
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});
  /**
   * Generic API request wrapper
   */
  const apiRequest = async (url, options = {}, expectBlob = false) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
      }

      return expectBlob ? response.blob() : response.json();
    } catch (error) {
      console.error("API error:", error);
      throw error;
    }
  };

  /**
   * Utility to show toast notifications
   */
  const showToast = (title, status, description = null) => {
    toast({
      title,
      description,
      status,
      duration: 3000,
      isClosable: true,
    });
  };

  /**
   * File operations
   */
  const handleFileCut = async (filename, currentPath, newPath) => {
    try {
      await apiRequest("/api/cut-file", {
        method: "POST",
        body: JSON.stringify({ filename, currentPath, newPath }),
      });
      onRefresh(newPath);
      showToast("File moved", "success");
    } catch {
      showToast("Error moving file", "error");
    }
  };

  const handleFileDownload = (fileName, path) => {
    const token = localStorage.getItem("token");
    window.location.href = `/api/download/${path}/${fileName}?token=${token}&t=${Date.now()}`;
  };

  const handleFileDelete = async (fileName, path) => {
    try {
      await apiRequest(`/api/delete/${path}/${fileName}`, {
        method: "POST",
        body: JSON.stringify({ fileName }),
      });
      onRefresh();
      showToast("File deleted", "success");
    } catch {
      showToast("Error deleting file", "error");
    }
  };

  const handleFileShareLink = async (fileName, filePath) => {
    try {
      await apiRequest("/api/share", {
        method: "POST",
        body: JSON.stringify({ fileName, filePath }),
      });
      onRefresh();
      showToast(
        "Link generated",
        "success",
        `Share link created for ${fileName}`,
      );
    } catch {
      showToast(
        "Error generating link",
        "error",
        `Failed to generate link for ${fileName}`,
      );
    }
  };

  const handleDeleteFolder = async (folderName, path) => {
    try {
      await apiRequest("/api/delete-folder", {
        method: "POST",
        body: JSON.stringify({ folderName, folderPath: path }),
      });
      onRefresh(path);
      showToast("Folder deleted", "success");
    } catch {
      showToast("Error deleting folder", "error");
    }
  };

  const createFolder = async (folderName, currentPath) => {
    try {
      await apiRequest("/api/create-folder", {
        method: "POST",
        body: JSON.stringify({ folderName, currentPath }),
      });
      onRefresh(currentPath);
      showToast("Folder created", "success");
    } catch {
      showToast("Error creating folder", "error");
    }
  };

  const handleRenameFile = async (filename, newFilename, path) => {
    if (!filename || !newFilename || !path) {
      showToast("Missing required fields", "error");
      return;
    }
    try {
      await apiRequest("/api/rename-file", {
        method: "POST",
        body: JSON.stringify({ filename, newFilename, currentPath: path }),
      });
      onRefresh(path);
      showToast("File renamed", "success");
    } catch {
      showToast("Error renaming file", "error");
    }
  };

  /**
   * Breadcrumb generator
   */
  const generateBreadcrumb = (path) => {
    const breadcrumbs = [{ name: "Home", path: "files" }];
    let currentPath = "files";

    path
      .split("/")
      .filter(Boolean)
      .forEach((part) => {
        currentPath += `/${part}`;
        breadcrumbs.push({ name: part, path: currentPath });
      });

    return breadcrumbs;
  };

  const handleCopy = (filename, rp, isFolder) => {
    copyFile({
      file: filename,
      path: rp,
      source: "local",
      ...(isFolder && { isDirectory: true }),
    });
  };

  function handleCut(filename, rp) {
    cutFile({ file: filename, path: rp, source: "local", serverId: null });
  }

  const handleFolderCopy = async (
    folderName,
    currentPath,
    newPath,
    serverId,
  ) => {
    try {
      await apiRequest("/api/copy-folder", {
        method: "POST",
        body: JSON.stringify({ folderName, currentPath, newPath, serverId }),
      });
      onRefresh(newPath);
      showToast("Folder copied", "success");
    } catch {
      showToast("Error copying folder", "error");
    }
  };

  const handlePaste = async (rp) => {
    if (!clipboard.length) return;

    const transferId = crypto.randomUUID();

    const initialTransfers = Object.fromEntries(
      clipboard.map(({ file }) => [
        `${transferId}-${file}`,
        { file, progress: 0 },
      ]),
    );
    setStartedTransfers(initialTransfers);

    const eventSource = new EventSource(`/api/progress/${transferId}`);

    eventSource.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.ready) {
        try {
          const res = await fetch("/api/paste-files", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              files: clipboard,
              newPath: rp,
              transferId,
            }),
          });
          if (!res.ok) {
            eventSource.close();
            showToast("Error pasting files", "error");
            setProgressMap({});
            setStartedTransfers({});
          }
        } catch (err) {
          eventSource.close();
          showToast("Error pasting files", "error");
          setProgressMap({});
          setStartedTransfers({});
        }
      } else if (data.file && data.percent !== undefined) {
        setProgressMap((prev) => ({
          ...prev,
          [`${transferId}-${data.file}`]: {
            file: data.file,
            progress: Math.round(data.percent),
          },
        }));
      } else if (data.done && data.file) {
        setProgressMap((prev) => ({
          ...prev,
          [`${transferId}-${data.file}`]: { file: data.file, progress: 100 },
        }));
      } else if (data.allDone) {
        eventSource.close();
        onRefresh(rp);
        setTimeout(() => {
          setProgressMap({});
          setStartedTransfers({});
        }, 400);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      showToast("Transfer connection lost", "error");
      setProgressMap({});
      setStartedTransfers({});
    };

    clearClipboard();
  };

  return {
    handleFolderCopy,
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
    createFolder,
    handleRenameFile,
    generateBreadcrumb,
    handleCopy,
    handleCut,
    handlePaste,
    progressMap,
    startedTransfers,
  };
};

export default FileController;
