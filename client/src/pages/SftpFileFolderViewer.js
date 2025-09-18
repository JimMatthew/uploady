import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Stack,
  Heading,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";
import FilePanel from "./FilePanel";

const FileFolderViewer = ({ serverId, toast, openFile, host }) => {
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

  const onOpenFile = (filename) => {
    openFile(serverId, files.currentDirectory, filename, host);
  };

  const onChangeDirectory = (folder) => {
    changeSftpDirectory(serverId, `${files.currentDirectory}/${folder}`);
  };

  const onDeleteFolder = (folder) => {
    deleteSftpFolder(folder, serverId, files.currentDirectory);
  };

  const onFolderCopy = (folder) => {
    handleCopy(folder, true);
  };

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
      <FilePanel
        files={files}
        handleDownload={handleDownload}
        onChangeDirectory={onChangeDirectory}
        onDeleteFolder={onDeleteFolder}
        handleDownloadFolder={handleDownloadFolder}
        onFolderCopy={onFolderCopy}
        handleDelete={handleDelete}
        handleShare={handleShare}
        handleRename={handleRename}
        handleCopy={handleCopy}
        handleCut={handleCut}
        handlePaste={handlePaste}
        onOpenFile={onOpenFile}
        changeDirectory={(dir) => changeSftpDirectory(serverId, dir)}
        onCreateFolder={onCreateFolder}
        startedTransfers={startedTransfers}
        progressMap={progressMap}
        generateBreadcrumb={generateBreadcrumb}
        fileUploadProps={{
          apiEndpoint: "/sftp/api/upload",
          additionalData: {
            serverId,
            currentDirectory: files.currentDirectory,
          },
          onUploadSuccess: onUploadSuccess,
        }}
      />
  );
};

export default FileFolderViewer;
