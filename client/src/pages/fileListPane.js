import React, { useEffect, useState } from "react";
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
import FolderListFile from "../components/FolderListFiles";
const FileDisplay = ({
  data,
  onFolderClick,
  onRefresh,
  toast,
  files,
  folders,
  handleBreadcrumbClick,
}) => {
  const {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
    generateBreadcrumb,
    createFolder,
  } = fileController({ toast, onRefresh });
  const { relativePath } = data;
  const rp = "/" + relativePath;
  const bgg = useColorModeValue("white", "gray.800");
  const isMobile = useBreakpointValue({ base: true, md: false });
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
          onClick={(path) => handleBreadcrumbClick(path)}
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
        <FolderListFile
          folders={folders}
          rp={rp}
          onFolderClick={onFolderClick}
          handleDeleteFolder={handleDeleteFolder}
        />

        <FileListFile
          files={files}
          rp={rp}
          handleFileDownload={handleFileDownload}
          handleFileShareLink={handleFileShareLink}
          handleFileDelete={handleFileDelete}
        />
      </VStack>
    </Box>
  );
};

export default FileDisplay;
