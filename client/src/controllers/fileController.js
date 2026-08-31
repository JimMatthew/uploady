import { useClipboard } from "../contexts/ClipboardContext";
import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/apiClient";
import { useTransferJob } from "../hooks/useTransferJob";

const FileController = ({ toast, onRefresh }) => {
  const token = localStorage.getItem("token");
  const { copyFile, clipboard, cutFile, clearClipboard } = useClipboard();
  //const [progressMap, setProgressMap] = useState({});
  //const [startedTransfers, setStartedTransfers] = useState({});

  const {
    progressMap,
    startedTransfers,
    trackJob,
  } = useTransferJob({
    onError: () =>
      showToast("Transfer connection lost", "error"),
  });
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
      await apiClient.post("/api/cut-file", {
        filename,
        currentPath,
        newPath,
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
      await apiClient.post(`/api/delete/${path}/${fileName}`, {
        fileName,
      });
      onRefresh();
      showToast("File deleted", "success");
    } catch {
      showToast("Error deleting file", "error");
    }
  };

  const handleFileShareLink = async (fileName, filePath) => {
    try {
      await apiClient.post("/api/share", {
        fileName,
        filePath,
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
      await apiClient.post("/api/delete-folder", {
        folderName,
        folderPath: path,
      });
      onRefresh(path);
      showToast("Folder deleted", "success");
    } catch {
      showToast("Error deleting folder", "error");
    }
  };

  const createFolder = async (folderName, currentPath) => {
    try {
      await apiClient.post("/api/create-folder", {
        folderName,
        currentPath,
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
      await apiClient.post("/api/rename-file", {
        filename,
        newFilename,
        currentPath: path,
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
      await apiClient.post("/api/copy-folder", {
        folderName,
        currentPath,
        newPath,
        serverId,
      });
      onRefresh(newPath);
      showToast("Folder copied", "success");
    } catch {
      showToast("Error copying folder", "error");
    }
  };

  const handlePaste = async (rp) => {
    if (!clipboard.length) return;

    try {
      const items = [...clipboard];

      const { jobId } = await apiClient.post("/api/paste-files", {
        files: items,
        newPath: rp,
      });

      clearClipboard();

      trackJob({
        jobId,
        items,
        onDone: () => onRefresh(rp),
      });
    } catch {
      showToast("Error pasting files", "error");
    }
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
