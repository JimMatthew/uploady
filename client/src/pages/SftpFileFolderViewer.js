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
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderListSftp from "../components/FolderList";
import FileListFile from "../components/FileListFiles";
import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";
import TransferProgress from "../components/TransferProgress";

const FileFolderViewer = ({ serverId, toast, openFile }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const {
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
    changeSftpDirectory,
  } = useSftpFileFolderViewer({ serverId, toast });

  const handleCut = (filename) => {};

  const onUploadSuccess = () =>
    changeSftpDirectory(serverId, files.currentDirectory);

  const onCreateFolder = (folder) =>
    createSftpFolder(folder, serverId, files.currentDirectory);

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" />
        <Text mt={2}>Connecting to the server...</Text>
      </Box>
    );
  }

  if (!files || !Array.isArray(files.folders) || !Array.isArray(files.files)) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="lg" color="red.500">
          Failed to connect to the server or no files available.
        </Text>
      </Box>
    );
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
              onUploadSuccess={onUploadSuccess}
            />
          ) : (
            <Upload
              apiEndpoint={"/sftp/api/upload"}
              additionalData={{
                serverId,
                currentDirectory: files.currentDirectory,
              }}
              onUploadSuccess={onUploadSuccess}
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

        <CreateFolderComponent handleCreateFolder={onCreateFolder} />
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
        handleCopy={(name) => handleCopy(name, true)}
      />
      {/* Clipboard Copy progress*/}
      <TransferProgress 
        transfers={startedTransfers}
        progressMap={progressMap}
      />

      <FileListFile
        files={files.files}
        handleFileDownload={handleDownload}
        handleFileDelete={handleDelete}
        handleFileShareLink={handleShare}
        handleRenameFile={handleRename}
        handleFileCopy={(filename) => handleCopy(filename, false)}
        handleFileCut={handleCut}
        handleFilePaste={handlePaste}
        handleOpenFile={(filename) =>
          openFile(serverId, files.currentDirectory, filename)
        }
      />
    </Box>
  );
};

export default FileFolderViewer;
