import { useEffect, useState, useCallback } from "react";
import useFileController from "../controllers/fileController";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";

export function useFileList({ toast }) {
  const [fileData, setFileData] = useState(null);
  const [currentPath, setCurrentPath] = useState("files");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Core fetch
  // ---------------------------------------------------------------------------

  const fetchFiles = useCallback(
    async (path) => {
      //setLoading(true);
      try {
        const response = await fetch(`/api/${path}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401 || response.status === 403) {
          navigate("/");
          return;
        }

        if (!response.ok) {
          console.error("Failed to fetch files:", response.status);
          return;
        }

        const data = await response.json();
        setFileData(data);
      } catch (err) {
        console.error("Error fetching files:", err);
      } finally {
        setLoading(false);
      }
    },
    [token, navigate],
  );

  // reload always uses the current path
  const reload = useCallback(() => {
    console.log("reload recreated");
    fetchFiles(currentPath);
  }, [fetchFiles, currentPath]);

  // ---------------------------------------------------------------------------
  // Controller — named as a hook so React handles memoization correctly
  // and function references stay stable across renders
  // ---------------------------------------------------------------------------

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
  } = useFileController({ toast, onRefresh: reload });

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
    (name) => handleFileDownload(name, fileData?.relativePath),
    [handleFileDownload, fileData?.relativePath],
  );

  const onFileDelete = useCallback(
    (name) => handleFileDelete(name, fileData?.relativePath),
    [handleFileDelete, fileData?.relativePath],
  );

  const onFileShare = useCallback(
    (name) => handleFileShareLink(name, fileData?.relativePath),
    [handleFileShareLink, fileData?.relativePath],
  );

  const onFileCopy = useCallback(
    (name) => handleCopy(name, fileData?.relativePath, false),
    [handleCopy, fileData?.relativePath],
  );

  const onFileCut = useCallback(
    (name) => handleCut(name, fileData?.relativePath),
    [handleCut, fileData?.relativePath],
  );

  const onFileRename = useCallback(
    (name, newName) => handleRenameFile(name, newName, fileData?.relativePath),
    [handleRenameFile, fileData?.relativePath],
  );

  const onFolderDelete = useCallback(
    (folder) => handleDeleteFolder(folder, fileData?.relativePath),
    [handleDeleteFolder, fileData?.relativePath],
  );

  const onFolderCopy = useCallback(
    (folder) => handleCopy(folder, fileData?.relativePath, true),
    [handleCopy, fileData?.relativePath],
  );

  const onPaste = useCallback(
    () => handlePaste(fileData?.relativePath),
    [handlePaste, fileData?.relativePath],
  );

  const onCreateFolder = useCallback(
    (folder) => createFolder(folder, fileData?.relativePath),
    [createFolder, fileData?.relativePath], // was [handleCopy, ...] — bug fix
  );

  const onGenerateBreadcrumb = useCallback(
    () => generateBreadcrumb(fileData?.relativePath),
    [generateBreadcrumb, fileData?.relativePath],
  );

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
  };
}
