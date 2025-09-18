import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Container,
  useBreakpointValue,
  Spinner,
  Text,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useFileList } from "../hooks/useFileList";
import FilePanel from "./FilePanel";
import fileController from "../controllers/fileController";
const FileList = ({ toast }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { fileData, setCurrentPath, loading, handleFolderClick, reload } =
    useFileList();
  const {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
    generateBreadcrumb,
    createFolder,
    handleRenameFile,
    handleFolderCopy,
    handleCopy,
    handleCut,
    handlePaste,
  } = fileController({ toast, onRefresh: reload });

  const onFileDownload = useCallback(
    (name) => handleFileDownload(name, fileData.relativePath),
    [handleFileDownload, fileData]
  );

  const onFileDelete = useCallback(
    (name) => handleFileDelete(name, fileData.relativePath),
    [handleFileDelete, fileData]
  );

  const onFileShare = useCallback(
    (name) => handleFileShareLink(name, fileData.relativePath),
    [handleFileShareLink, fileData]
  );

  const onFileCopy = useCallback(
    (name) => handleCopy(name, fileData.relativePath, false),
    [handleCopy, fileData]
  );

  const onFileCut = useCallback(
    (name) => handleCut(name, fileData.relativePath),
    [handleCut, fileData]
  );

  const onFileRename = useCallback(
    (name, newName) => handleRenameFile(name, newName, fileData.relativePath),
    [handleRenameFile, fileData]
  );

  const onFolderDelete = useCallback(
    (folder) => handleDeleteFolder(folder, fileData.relativePath),
    [handleDeleteFolder, fileData]
  );

  const onFolderCopy = useCallback(
    (folder) => handleCopy(folder, fileData.relativePath, true),
    [handleCopy, fileData]
  );

  const onPaste = useCallback(
    () => handlePaste(fileData.relativePath),
    [handlePaste, fileData]
  );

  const onCreateFolder = useCallback(
    (folder) => createFolder(folder, fileData.relativePath),
    [handleCopy, fileData]
  );

  const bgg = useColorModeValue("white", "gray.700");
  if (loading || !fileData)
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" />
        <Text mt={2}>Loading...</Text>
      </Box>
    );

  return (
    <Box as="main" minH="80vh" py={8}>
      <Container maxW="container.lg">
        {/* Link to SFTP Servers */}

        <Box align="center">
          <Link to="/api/sftp">
            <Button colorScheme="blue" mb={6} size="lg" variant="outline">
              Go to SFTP Servers
            </Button>
          </Link>
        </Box>

        <FilePanel
          files={fileData}
          handleDownload={onFileDownload}
          onChangeDirectory={handleFolderClick}
          onDeleteFolder={onFolderDelete}
          handleDelete={onFileDelete}
          handleShare={onFileShare}
          handleRename={onFileRename}
          handleCopy={onFileCopy}
          handleCut={onFileCut}
          handlePaste={onPaste}
          changeDirectory={setCurrentPath}
          onCreateFolder={onCreateFolder}
          generateBreadcrumb={() => generateBreadcrumb(fileData.relativePath)}
          onFolderCopy={onFolderCopy}
          fileUploadProps={{
            apiEndpoint: "/api/upload",
            additionalData: { folderPath: fileData.relativePath },
            onUploadSuccess: reload,
          }}
        />
      </Container>
    </Box>
  );
};

export default FileList;
