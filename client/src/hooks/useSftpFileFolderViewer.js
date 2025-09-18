import React, { useState, useEffect, useCallback } from "react";
import { useClipboard } from "../contexts/ClipboardContext";
import SftpController from "../controllers/SftpController";
export function useSftpFileFolderViewer({ serverId, toast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});
  const { copyFile, cutFile, clipboard, clearClipboard } = useClipboard();
  const {
    deleteSftpFile,
    downloadSftpFile,
    deleteSftpFolder,
    createSftpFolder,
    generateBreadcrumb,
    changeSftpDirectory,
    shareSftpFile,
    renameSftpFile,
    downloadFolder,
    connectToServer,
  } = SftpController({ toast, setFiles });

  const handleDownload = useCallback(
    (filename) => {
      downloadSftpFile(filename, serverId, files.currentDirectory);
    },
    [serverId, files.currentDirectory]
  );

  const handleDelete = useCallback(
    (filename) => {
      deleteSftpFile(filename, serverId, files.currentDirectory);
    },
    [serverId, files.currentDirectory]
  );

  const handleShare = useCallback(
    (filename) => {
      shareSftpFile(filename, serverId, files.currentDirectory);
    },
    [serverId, files.currentDirectory]
  );

  const handleRename = useCallback(
    (filename, newfilename) => {
      renameSftpFile(files.currentDirectory, serverId, filename, newfilename);
    },
    [serverId, files.currentDirectory]
  );

  const handleDownloadFolder = useCallback(
    (foldername) => {
      downloadFolder(files.currentDirectory, foldername, serverId);
    },
    [serverId, files.currentDirectory]
  );

  const handleCut = useCallback((filename) => {
    // TODO: implement cut functionality
  }, []);

  const onUploadSuccess = useCallback(() => {
    changeSftpDirectory(serverId, files.currentDirectory);
  }, [serverId, files.currentDirectory]);

  const onCreateFolder = useCallback(
    (folder) => {
      createSftpFolder(folder, serverId, files.currentDirectory);
    },
    [serverId, files.currentDirectory]
  );

  const onDeleteFolder = useCallback(
    (folder) => {
      deleteSftpFolder(folder, serverId, files.currentDirectory);
    },
    [serverId, files.currentDirectory]
  );

  const onChangeDirectory = useCallback(
    (folder) => {
       changeSftpDirectory(serverId, `${files.currentDirectory}/${folder}`)
    },
    [serverId, files.currentDirectory]
  );

  const onChangeDir = useCallback(
    (folder) => {
       changeSftpDirectory(serverId, folder)
    },
    [serverId]
  );

  const handleCopy = useCallback(
    (filename, isFolder) => {
      copyFile({
        file: filename,
        path: files.currentDirectory,
        source: "sftp",
        serverId: serverId,
        ...(isFolder && { isDirectory: true }),
      });
    },
    [files.currentDirectory, serverId, copyFile]
  );

  const onFolderCopy = useCallback(
    (folder) => {
      handleCopy(folder, true);
    },
    [handleCopy]
  );

  useEffect(() => {
    if (!connected) {
      setLoading(true);
      connectToServer(serverId).then(() => {
        setConnected(true);
        setLoading(false);
      });
    }
  }, [serverId, connected]);

  const handlePaste = () => {
    const transferId = crypto.randomUUID();
    const eventSource = new EventSource(`/sftp/api/progress/${transferId}`);

    const batchTransfer = {};
    clipboard.forEach(({ file }) => {
      batchTransfer[`${transferId}-${file}`] = { file, progress: 0 };
    });
    //setStartedTransfers((prev) => ({ ...prev, ...batchTransfer }));
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
          [`${transferId}-${data.file}`]: {
            file: data.file,
            progress: 100,
          },
        }));
      } else if (data.allDone) {
        eventSource.close();
        changeSftpDirectory(serverId, files.currentDirectory);
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
  };

  return {
    files,
    loading,
    progressMap,
    startedTransfers,
    handleCopy,
    handleDownloadFolder,
    handleRename,
    handleShare,
    handleDelete,
    handleDownload,
    handlePaste,
    deleteSftpFolder,
    createSftpFolder,
    generateBreadcrumb,
    onChangeDirectory,
    onCreateFolder,
    onDeleteFolder,
    onFolderCopy,
    onUploadSuccess,
    handleCut,
    onChangeDir
  };
}
