import { useState, useEffect, useCallback } from "react";
import { useClipboard } from "../contexts/ClipboardContext";
import { useNavigate } from "react-router-dom";

export function useSftpFileFolderViewer({ serverId, toast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});
  const { copyFile, cutFile, clipboard, clearClipboard } = useClipboard();

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const apiRequest = useCallback(
    async (url, options = {}, expectBlob = false) => {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (response.status === 401) {
          navigate("/");
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Request failed");
        }

        return expectBlob ? response.blob() : response.json();
      } catch (error) {
        console.error("API error:", error);
        throw error;
      }
    },
    [token, navigate]
  );

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
    [toast]
  );

  const downloadFileBlob = useCallback((blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleDownload = useCallback(
    async (filename) => {
      try {
        const blob = await apiRequest(
          `/sftp/api/download/${serverId}/${files.currentDirectory}/${filename}`,
          {},
          true
        );
        downloadFileBlob(blob, filename);
      } catch {
        showToast("Error downloading file", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, downloadFileBlob, showToast]
  );

  const handleDownloadFolder = useCallback(
    async (foldername) => {
      try {
        const folder = `${files.currentDirectory}/${foldername}`;
        const blob = await apiRequest(
          `/sftp/api/download-folder/${serverId}/${folder}`,
          {},
          true
        );
        downloadFileBlob(blob, `${foldername}.zip`);
        showToast("Folder downloaded", "success");
      } catch {
        showToast("Error downloading folder", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, downloadFileBlob, showToast]
  );

  const handleDelete = useCallback(
    async (filename) => {
      try {
        await apiRequest("/sftp/api/delete-file", {
          method: "POST",
          body: JSON.stringify({
            currentDirectory: files.currentDirectory,
            serverId,
            fileName: filename,
          }),
        });
        await changeSftpDirectory(files.currentDirectory);
        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, showToast]
  );

  const handleRename = useCallback(
    async (filename, newfilename) => {
      try {
        await apiRequest("/sftp/api/renameFile", {
          method: "POST",
          body: JSON.stringify({
            currentPath: files.currentDirectory,
            fileName: filename,
            newFileName: newfilename,
            serverId,
          }),
        });
        await changeSftpDirectory(files.currentDirectory);
        showToast("File renamed", "success");
      } catch {
        showToast("Error renaming file", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, showToast]
  );

  const handleShare = useCallback(
    async (filename) => {
      const remotePath = `${files.currentDirectory}/${filename}`;
      try {
        await apiRequest("/sftp/api/sharefile", {
          method: "POST",
          body: JSON.stringify({ serverId, remotePath }),
        });
        showToast("File shared", "success");
      } catch {
        showToast("Error sharing file", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, showToast]
  );

  const handleCopy = useCallback(
    (filename, isFolder) => {
      copyFile({
        file: filename,
        path: files.currentDirectory,
        source: "sftp",
        serverId,
        ...(isFolder && { isDirectory: true }),
      });
    },
    [files?.currentDirectory, serverId, copyFile]
  );

  const onFolderCopy = useCallback(
    (folder) => handleCopy(folder, true),
    [handleCopy]
  );

  const handlePaste = useCallback(() => {
    const transferId = crypto.randomUUID();
    const eventSource = new EventSource(`/sftp/api/progress/${transferId}`);

    const batchTransfer = {};
    clipboard.forEach(({ file }) => {
      batchTransfer[`${transferId}-${file}`] = { file, progress: 0 };
    });
    setStartedTransfers(batchTransfer);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.ready) {
        fetch("/sftp/api/copy-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: clipboard,
            newPath: files.currentDirectory,
            newServerId: serverId,
            transferId,
          }),
        });
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
        changeSftpDirectory(files.currentDirectory);
        setTimeout(() => {
          setProgressMap({});
          setStartedTransfers({});
        }, 400);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    clearClipboard();
  }, [ files?.currentDirectory, serverId, clearClipboard]);

  const connectToServer = useCallback(
    async (serverId) => {
      try {
        const data = await apiRequest(`/sftp/api/connect/${serverId}/`);
        setFiles(data);
      } catch {
        showToast("Error connecting to server", "error");
      }
    },
    [apiRequest, showToast]
  );

  const changeSftpDirectory = useCallback(
    async (directory) => {
      try {
        const data = await apiRequest(
          `/sftp/api/connect/${serverId}/${directory}/`
        );
        setFiles(data);
      } catch {
        showToast("Error listing directory", "error");
      }
    },
    [apiRequest, showToast]
  );

  useEffect(() => {
    if (!connected) {
      setLoading(true);
      connectToServer(serverId).then(() => {
        setConnected(true);
        setLoading(false);
      });
    }
  }, [serverId, connected, connectToServer]);

  const generateBreadcrumb = useCallback((path) => {
    const parts = path.split("/").filter(Boolean);
    let currentPath = "";
    const breadcrumbs = parts.map((part) => {
      currentPath += `/${part}`;
      return { name: part, path: currentPath };
    });
    return [{ name: "Home", path: "/" }, ...breadcrumbs];
  }, []);

  const onChangeDirectory = useCallback(
    (folder) => {
      changeSftpDirectory(`${files.currentDirectory}/${folder}`);
    },
    [serverId, files.currentDirectory]
  );

  const onUploadSuccess = useCallback(
    () => changeSftpDirectory(files.currentDirectory),
    [files?.currentDirectory]
  );

  const onDeleteFolder = useCallback(
    async (folder) => {
      try {
        await apiRequest("/sftp/api/delete-folder", {
          method: "POST",
          body: JSON.stringify({
            currentDirectory: files.currentDirectory,
            serverId,
            deleteDir: folder,
          }),
        });
        await changeSftpDirectory(files.currentDirectory);
        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, showToast]
  );

  const onCreateFolder = useCallback(
    async (folder) => {
      try {
        await apiRequest("/sftp/api/create-folder", {
          method: "POST",
          body: JSON.stringify({
            currentPath: files.currentDirectory,
            serverId,
            folderName: folder,
          }),
        });
        await changeSftpDirectory(files.currentDirectory);
        showToast("File deleted", "success");
      } catch {
        showToast("Error deleting file", "error");
      }
    },
    [serverId, files?.currentDirectory, apiRequest, showToast]
  );

  return {
    files,
    loading,
    progressMap,
    startedTransfers,
    handleCopy,
    onFolderCopy,
    handleDownload,
    handleDownloadFolder,
    handleRename,
    handleShare,
    handleDelete,
    handlePaste,
    generateBreadcrumb,
    changeSftpDirectory,
    onChangeDirectory,
    onUploadSuccess,
    onCreateFolder,
    onDeleteFolder,
  };
}
