import React, { useMemo } from "react";
import {
  Box,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useSftpFileFolderViewer } from "../hooks/useSftpFileFolderViewer";
import FilePanel from "./FilePanel";

const FileFolderViewer = ({ serverId, toast, openFile, host }) => {
  const {
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
    onChangeDirectory,
    onCreateFolder,
    onDeleteFolder,
    onUploadSuccess,
    handleCut,
    changeSftpDirectory
  } = useSftpFileFolderViewer({ serverId, toast });

  const fileUploadProps = useMemo(
    () => ({
      apiEndpoint: "/sftp/api/upload",
      additionalData: {
        serverId,
        currentDirectory: files.currentDirectory,
      },
      onUploadSuccess: onUploadSuccess,
    }),
    [files?.currentDirectory, serverId, onUploadSuccess]
  );

   const onOpenFile = (filename) => {
    openFile(serverId, files.currentDirectory, filename, host);
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
      changeDirectory={changeSftpDirectory}
      onCreateFolder={onCreateFolder}
      startedTransfers={startedTransfers}
      progressMap={progressMap}
      generateBreadcrumb={generateBreadcrumb}
      fileUploadProps={fileUploadProps}
    />
  );
};

export default FileFolderViewer;
