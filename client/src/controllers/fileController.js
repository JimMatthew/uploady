import { useClipboard } from "../contexts/ClipboardContext";
const FileController = ({ toast, onRefresh }) => {
  const token = localStorage.getItem("token");
  const { copyFile, clipboard, cutFile, clearClipboard } = useClipboard();
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
  const handleFileCopy = async (filename, currentPath, newPath) => {
    try {
      await apiRequest("/api/copy-file", {
        method: "POST",
        body: JSON.stringify({ filename, currentPath, newPath }),
      });
      onRefresh(newPath);
      showToast("File copied", "success");
    } catch {
      showToast("Error copying file", "error");
    }
  };

  const handleFolderCopy = async (folderName, currentPath, newPath) => {
    try {
      await apiRequest("/api/copy-folder", {
        method: "POST",
        body: JSON.stringify({ folderName, currentPath, newPath }),
      });
      onRefresh(newPath);
      showToast("Folder copied", "success");
    } catch {
      showToast("Error copying folder", "error");
    }
  };

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

  const handleFileDownload = async (fileName, path) => {
    try {
      const blob = await apiRequest(
        `/api/download/${path}/${fileName}`,
        {},
        true
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Error downloading file", "error");
    }
  };

  const handleFileDelete = async (fileName, path) => {
    try {
      await apiRequest(`/api/delete/${path}/${fileName}`, {
        method: "POST",
        body: JSON.stringify({ fileName }),
      });
      onRefresh(path);
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
        `Share link created for ${fileName}`
      );
    } catch {
      showToast(
        "Error generating link",
        "error",
        `Failed to generate link for ${fileName}`
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

  function handlePaste(rp) {
    clipboard.forEach(({ file, path, action, isDirectory }) => {
      if (action === "copy") {
        if (isDirectory) {
          handleFolderCopy(file, path, rp);
        } else {
          handleFileCopy(file, path, rp);
        }
      } else if (action === "cut") handleFileCut(file, path, rp);
    });
    clearClipboard();
  }

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
    handlePaste
  };
};

export default FileController;
