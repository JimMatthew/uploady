import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Stack,
  Heading,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/UploadComponent";
import DragAndDropComponent from "../components/DragDropComponent";
import SftpController from "../controllers/SftpController";
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderListSftp from "../components/FolderListSftp";
import FileListSftp from "../components/FileListSftp";
const FileFolderViewer = ({ serverId, toast, openFile }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
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
      />
    </Box>
  );
};

export default FileFolderViewer;
