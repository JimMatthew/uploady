import React, { useEffect, useState, useCallback } from "react";
import fileController from "../controllers/fileController";
import { useNavigate } from "react-router-dom";
export function useFileList({ toast }) {
  const [fileData, setFileData] = useState(null);
  const [currentPath, setCurrentPath] = useState("files");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const reload = () => {
    fetchFiles(currentPath);
  };

  const {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
    generateBreadcrumb,
    createFolder,
    handleRenameFile,
    handleCopy,
    handleCut,
    handlePaste,
  } = fileController({ toast, onRefresh: reload });

  const onFileDownload = useCallback(
    (name) => {
      if (!fileData?.relativePath) return;
      handleFileDownload(name, fileData.relativePath);
    },
    [handleFileDownload, fileData?.relativePath]
  );

  const onFileDelete = useCallback(
    (name) => handleFileDelete(name, fileData.relativePath),
    [handleFileDelete, fileData?.relativePath]
  );

  const onFileShare = useCallback(
    (name) => handleFileShareLink(name, fileData.relativePath),
    [handleFileShareLink, fileData?.relativePath]
  );

  const onFileCopy = useCallback(
    (name) => handleCopy(name, fileData.relativePath, false),
    [handleCopy, fileData?.relativePath]
  );

  const onFileCut = useCallback(
    (name) => handleCut(name, fileData.relativePath),
    [handleCut, fileData?.relativePath]
  );

  const onFileRename = useCallback(
    (name, newName) => handleRenameFile(name, newName, fileData.relativePath),
    [handleRenameFile, fileData?.relativePath]
  );

  const onFolderDelete = useCallback(
    (folder) => handleDeleteFolder(folder, fileData.relativePath),
    [handleDeleteFolder, fileData?.relativePath]
  );

  const onFolderCopy = useCallback(
    (folder) => handleCopy(folder, fileData.relativePath, true),
    [handleCopy, fileData?.relativePath]
  );

  const onPaste = useCallback(
    () => handlePaste(fileData.relativePath),
    [handlePaste, fileData?.relativePath]
  );

  const onCreateFolder = useCallback(
    (folder) => createFolder(folder, fileData.relativePath),
    [handleCopy, fileData?.relativePath]
  );

  const onGenerateBreadcrumb = useCallback(
    () => generateBreadcrumb(fileData.relativePath),
    [generateBreadcrumb, fileData?.relativePath]
  );

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchFiles(currentPath);
      setLoading(false);
    } else {
      navigate("/");
      console.error("No token found");
    }
  }, [currentPath, token]);

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) => `${prevPath}/${folderName}`);
  };

  const fetchFiles = async (path) => {
    try {
      const response = await fetch(`/api/${path}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200) {
        navigate("/");
        return;
      }
      const data = await response.json();
      setFileData(data);
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };
  return {
    fileData,
    setCurrentPath,
    loading,
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
  };
}
