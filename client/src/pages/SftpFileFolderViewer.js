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
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderListSftp from "../components/FolderList";
import FileListFile from "../components/FileListFiles";
import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";

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
        handleCopy={(name) => handleCopy(name, true)}
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

      <FileListFile 
        files={files.files}
        handleFileDownload={(filename) => handleDownload(filename)}
        handleFileDelete={(filename) => handleDelete(filename)}
        handleFileShareLink={(filename) => handleShare(filename)}
        handleRenameFile={(filename, newfilename) =>
          handleRename(filename, newfilename)}
        handleFileCopy={(filename) => handleCopy(filename, false)}
        handleFileCut={handleCut}
        handleFilePaste={() => handlePaste()}
        handleOpenFile={(filename) =>
          openFile(serverId, files.currentDirectory, filename)}
      />
    </Box>
  );
};

export default FileFolderViewer;

/*

*/
