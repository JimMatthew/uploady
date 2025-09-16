import React from "react";
import {
  Box,
  VStack,
  Stack,
  useColorModeValue,
  useBreakpointValue,
} from "@chakra-ui/react";
import CreateFolderComponent from "../components/CreateFolderComponent";
import fileController from "../controllers/fileController";
import Breadcrum from "../components/Breadcrumbs";
import FileListFile from "../components/FileListFiles";
import FolderList from "../components/FolderList";
import { useState, useMemo, useCallback } from "react";
import ClipboardComponent from "../components/ClipboardComponent";
const FileDisplay = ({
  data,
  onFolderClick,
  onRefresh,
  toast,
  handleBreadcrumbClick,
}) => {
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
  } = fileController({ toast, onRefresh });
  const { relativePath, files, folders } = data;
  const rp = "/" + relativePath;
  const bgg = useColorModeValue("white", "gray.800");

  const onFileDownload = useCallback(
    (name) => handleFileDownload(name, rp),
    [handleFileDownload, rp]
  );

  const onFileDelete = useCallback(
    (name) => handleFileDelete(name, rp),
    [handleFileDelete, rp]
  );

  const onFileShare = useCallback(
    (name) => handleFileShareLink(name, rp),
    [handleFileShareLink, rp]
  );
  const onFileCopy = useCallback(
    (name) => handleCopy(name, rp, false),
    [handleCopy, rp]
  );

  const onFileCut = useCallback((name) => handleCut(name, rp), [handleCut, rp]);

  const onFileRename = useCallback(
    (name, newName) => handleRenameFile(name, newName, rp),
    [handleRenameFile, rp]
  );

  const onFolderDelete = useCallback(
    (folder) => handleDeleteFolder(folder, rp),
    [handleDeleteFolder, rp]
  )

  const onFolderCopy = useCallback(
    (folder) => handleCopy(folder, rp, true),
    [handleCopy, rp]
  )

  const onPaste = useCallback(() => handlePaste(rp), [handlePaste, rp]);

  return (
    <Box
      mt={{ base: 1, md: 6 }}
      p={{ base: 3, md: 6 }}
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="lg"
      bg={bgg}
      maxWidth="1200px"
      mx="auto"
    >
      {/* Header with Breadcrumb and Folder Creation */}
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "start", md: "center" }}
        spacing={4}
        mb={6}
      >
        <Breadcrum
          breadcrumb={generateBreadcrumb(rp)}
          onClick={handleBreadcrumbClick}
          color="gray.600"
        />

        <CreateFolderComponent
          handleCreateFolder={(folderName) => {
            createFolder(folderName, rp);
          }}
        />
      </Stack>

      {/* Folder and File Display */}
      <VStack spacing={6} align="stretch">
        <FolderList
          folders={folders}
          changeDirectory={onFolderClick}
          deleteFolder={onFolderDelete}
          handleCopy={onFolderCopy}
        />

        <FileListFile
          files={files}
          handleFileDownload={onFileDownload}
          handleFileShareLink={onFileShare}
          handleFileDelete={onFileDelete}
          handleFileCopy={onFileCopy}
          handleFileCut={onFileCut}
          handleRenameFile={onFileRename}
          handleFolderCopy={handleFolderCopy}
          handleFilePaste={onPaste}
        />
      </VStack>
    </Box>
  );
};

export default FileDisplay;
