import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Stack,
  Heading,
  Spinner,
  useBreakpointValue,
  Progress,
} from "@chakra-ui/react";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/UploadComponent";
import DragAndDropComponent from "../components/DragDropComponent";
import SftpController from "../controllers/SftpController";
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderListSftp from "../components/FolderListSftp";
import FileListSftp from "../components/FileListSftp";
import { useClipboard } from "../contexts/ClipboardContext";

const FileFolderViewer = ({ serverId, toast, openFile }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [progressMap, setProgressMap] = useState({});
  const [startedTransfers, setStartedTransfers] = useState({});
  const [completedTransfers, setCompletedTransfers] = useState({});

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
    handleSftpFileCopy,
  } = SftpController({ toast, setFiles });

  useEffect(() => {
    if (!connected) {
      setLoading(true);
      connectToServer(serverId).then(() => {
        setConnected(true);
        setLoading(false);
      });
    }
  }, [serverId, connected]);

  const handleDownload = (filename) => {
    downloadSftpFile(filename, serverId, files.currentDirectory);
  };

  const handleDelete = (filename) => {
    deleteSftpFile(filename, serverId, files.currentDirectory);
  };

  const handleShare = (filename) => {
    shareSftpFile(filename, serverId, files.currentDirectory);
  };

  const handleRename = (filename, newfilename) => {
    renameSftpFile(files.currentDirectory, serverId, filename, newfilename);
  };

  const handleDownloadFolder = (foldername) => {
    downloadFolder(files.currentDirectory, foldername, serverId);
  };

  const handleCopy = (filename) => {
    copyFile({
      file: filename,
      path: files.currentDirectory,
      source: "sftp",
      serverId: serverId,
    });
  };

  const handleCut = (filename) => {};

  const handlePaste = () => {
    const fileCountsByTransfer = {};
    const groupedByServer = {};
    clipboard.forEach((item) => {
      const key = item.serverId;
      if (!groupedByServer[key]) groupedByServer[key] = [];
      groupedByServer[key].push(item);
    });

    Object.entries(groupedByServer).forEach(([sourceServerId, items]) => {
      const transferId = crypto.randomUUID();
      const eventSource = new EventSource(`/sftp/api/progress/${transferId}`);
      fileCountsByTransfer[transferId] = items.length;
      // Mark all as started
      const batchTransfer = {};
      items.forEach(({ file }) => {
        batchTransfer[`${transferId}-${file}`] = { file, progress: 0 };
      });
      setStartedTransfers((prev) => ({ ...prev, ...batchTransfer }));

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.ready) {
          fetch("/sftp/api/copy-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: items,
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
          setCompletedTransfers((prev) => ({
            ...prev,
            [`${transferId}-${data.file}`]: true,
          }));
        } else if (data.allDone) {
          eventSource.close();
          changeSftpDirectory(serverId, files.currentDirectory);
          setTimeout(() => {
            setProgressMap({});
            setCompletedTransfers({});
            setStartedTransfers({});
          }, 400);
        }
      };
      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        eventSource.close();
      };
    });
    clearClipboard();
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" />
        <Text mt={2}>Connecting to the server...</Text>
      </Box>
    );
  }

  if (!files) {
    return <Text>No files found or failed to connect to the server.</Text>;
  }

  return (
    <Box
      p={{ base: 2, md: 6 }}
      borderWidth="1px"
      borderRadius="md"
      boxShadow="md"
      maxWidth="1200px"
      mx="auto"
    >
      {/* Heading */}
      <Box mb={6}>
        <Box align="center">
          {!isMobile ? (
            <DragAndDropComponent
              apiEndpoint={"/sftp/api/upload"}
              additionalData={{
                serverId,
                currentDirectory: files.currentDirectory,
              }}
              onUploadSuccess={() =>
                changeSftpDirectory(serverId, files.currentDirectory)
              }
            />
          ) : (
            <Upload
              apiEndpoint={"/sftp/api/upload"}
              additionalData={{
                serverId,
                currentDirectory: files.currentDirectory,
              }}
              onUploadSuccess={() =>
                changeSftpDirectory(serverId, files.currentDirectory)
              }
            />
          )}
        </Box>

        <Heading size="lg" mb={4} color="gray.700">
          Files and Folders
        </Heading>
      </Box>

      {/* Folder Creation and Breadcrumb */}
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "start", md: "center" }}
        spacing={4}
        mb={6}
      >
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={(directory) => changeSftpDirectory(serverId, directory)}
          color="gray.500"
        />

        <CreateFolderComponent
          handleCreateFolder={(folder) => {
            createSftpFolder(folder, serverId, files.currentDirectory);
          }}
        />
      </Stack>

      <FolderListSftp
        folders={files.folders}
        changeDirectory={(folder) =>
          changeSftpDirectory(serverId, `${files.currentDirectory}/${folder}`)
        }
        deleteFolder={(folder) =>
          deleteSftpFolder(folder, serverId, files.currentDirectory)
        }
        downloadFolder={(folder) => handleDownloadFolder(folder)}
      />
      {/* Clipboard Copy progress*/}
      {Object.entries(startedTransfers).map(([id, { file }]) => (
        <Box key={id} mb={2} p={3} borderRadius="md" borderWidth="1px">
          <Text>{file}</Text>
          <Progress
            value={progressMap[id]?.progress || 0}
            size="sm"
            colorScheme="blue"
          />
        </Box>
      ))}

      <FileListSftp
        files={files.files}
        downloadFile={handleDownload}
        deleteFile={handleDelete}
        openFile={(filename) =>
          openFile(serverId, files.currentDirectory, filename)
        }
        shareFile={(filename) => handleShare(filename)}
        renameFile={(filename, newfilename) =>
          handleRename(filename, newfilename)
        }
        handleCopy={handleCopy}
        handleCut={handleCut}
        handlePaste={handlePaste}
      />
    </Box>
  );
};

export default FileFolderViewer;
