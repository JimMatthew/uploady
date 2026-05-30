import { useState, useEffect, useCallback } from "react";
import { useClipboard } from "../contexts/ClipboardContext";
import { useNavigate } from "react-router-dom";
import { joinPath } from "../utils/path";

export function useSftpFileFolderViewer({ serverId, toast }) {
  const [files, setFiles] = useState([{}]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});

  const { copyFile, clipboard, clearClipboard } = useClipboard();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ---------------------------------------------------------------------------
  // Core API wrapper
  // ---------------------------------------------------------------------------

  const apiRequest = useCallback(
    async (url, options = {}, expectBlob = false) => {
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
    },
    [token, navigate],
  );

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
      const data = await apiRequest(`/sftp/api/connect/${serverId}/`);
      setFiles(data);
    } catch {
      showToast("Error connecting to server", "error");
    }
  }, [serverId, apiRequest, showToast]);

  const changeSftpDirectory = useCallback(
    async (directory) => {
      try {
        const data = await apiRequest(
          `/sftp/api/connect/${serverId}/${directory}/`,
        );
        setFiles(data);
      } catch {
        showToast("Error listing directory", "error");
      }
    },
    [serverId, apiRequest, showToast],
  );

  const onChangeDirectory = useCallback(
    (folder) => changeSftpDirectory(joinPath(files.currentDirectory, folder)),
    [changeSftpDirectory, files?.currentDirectory],
  );

  const onUploadSuccess = useCallback(
    () => changeSftpDirectory(files.currentDirectory),
    [changeSftpDirectory, files?.currentDirectory],
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

  const handleDownload = useCallback(
    (filename) => {
      const token = localStorage.getItem("token");
      window.location.href = `/sftp/api/download/${serverId}/${files.currentDirectory}/${filename}?token=${token}&t=${Date.now()}`;
    },
    [serverId, files?.currentDirectory],
  );

  const handleDownloadFolder = useCallback(
    async (foldername) => {
      try {
        const folder = `${files.currentDirectory}/${foldername}`;
        const blob = await apiRequest(
          `/sftp/api/download-folder/${serverId}/${folder}`,
          {},
          true,
        );
        downloadFileBlob(blob, `${foldername}.zip`);
        showToast("Folder downloaded", "success");
      } catch {
        showToast("Error downloading folder", "error");
      }
    },
    [
      serverId,
      files?.currentDirectory,
      apiRequest,
      downloadFileBlob,
      showToast,
    ],
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
    [
      serverId,
      files?.currentDirectory,
      apiRequest,
      changeSftpDirectory,
      showToast,
    ],
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
    [
      serverId,
      files?.currentDirectory,
      apiRequest,
      changeSftpDirectory,
      showToast,
    ],
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
    [serverId, files?.currentDirectory, apiRequest, showToast],
  );

  // ---------------------------------------------------------------------------
  // Folder operations
  // ---------------------------------------------------------------------------

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
        showToast("Folder deleted", "success");
      } catch {
        showToast("Error deleting folder", "error");
      }
    },
    [
      serverId,
      files?.currentDirectory,
      apiRequest,
      changeSftpDirectory,
      showToast,
    ],
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
        showToast("Folder created", "success");
      } catch {
        showToast("Error creating folder", "error");
      }
    },
    [
      serverId,
      files?.currentDirectory,
      apiRequest,
      changeSftpDirectory,
      showToast,
    ],
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

  const onFolderCopy = useCallback(
    (folder) => handleCopy(folder, true),
    [handleCopy],
  );

 const handlePaste = useCallback(async () => {
  if (!clipboard.length) return;

  try {
    // POST first — server creates the job and returns jobId
    const res = await fetch("/sftp/api/copy-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: clipboard,
        newPath: files.currentDirectory,
        newServerId: serverId,
      }),
    });

    if (!res.ok) {
      showToast("Error pasting files", "error");
      return;
    }

    const { jobId } = await res.json();

    // pre-populate progress map from clipboard (we still know the files)
    const initialTransfers = Object.fromEntries(
      clipboard.map(({ file }) => [
        `${jobId}-${file}`,
        { file, progress: 0 },
      ]),
    );
    setStartedTransfers(initialTransfers);

    clearClipboard();

    // open SSE after we have jobId
    const eventSource = new EventSource(`/sftp/api/progress/${jobId}?token=${token}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.ready) {
        // channel open, job already running — nothing to do
        return;
      }

      if (data.type === "fileProgress") {
        setProgressMap((prev) => ({
          ...prev,
          [`${jobId}-${data.file}`]: {
            file: data.file,
            progress: Math.round(data.percent),
          },
        }));
      } else if (data.type === "fileDone") {
        setProgressMap((prev) => ({
          ...prev,
          [`${jobId}-${data.file}`]: { file: data.file, progress: 100 },
        }));
      } else if (data.type === "fileFail") {
        setProgressMap((prev) => ({
          ...prev,
          [`${jobId}-${data.file}`]: { file: data.file, progress: 0, error: data.error },
        }));
      } else if (data.type === "jobDone") {
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
      showToast("Transfer connection lost", "error");
      setProgressMap({});
      setStartedTransfers({});
    };

  } catch (err) {
    console.error("Paste error:", err);
    showToast("Error pasting files", "error");
  }
}, [
  clipboard,
  files?.currentDirectory,
  serverId,
  clearClipboard,
  changeSftpDirectory,
  showToast,
  token,
]);

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
    connected,
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
