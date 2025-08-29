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
import { useClipboard } from "../contexts/ClipboardContext";
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
    handleFileCopy,
    handleFileCut,
    handleRenameFile,
    handleFolderCopy,
  } = fileController({ toast, onRefresh });
  const { relativePath } = data;
  const rp = "/" + relativePath;
  const bgg = useColorModeValue("white", "gray.800");
  const { copyFile, clipboard, cutFile, clearClipboard } = useClipboard();
  const handleCopy = (filename, isFolder) => {
    copyFile({
      file: filename,
      path: rp,
      source: "local",
      ...(isFolder && { isDirectory: true }),
    });
  };

  function handleCut(filename) {
    cutFile({ file: filename, path: rp, source: "local", serverId: null });
  }

  function handlePaste() {
    clipboard.forEach(({ file, path, action, isDirectory }) => {
      if (action === "copy") {
        if (isDirectory) {
          handleFolderCopy(file, path, rp);
        } else {
          handleFileCopy(file, path, rp);
        }
      } else if (action === "cut") handleFileCut(file, path, rp);
    });
    clearClipboard();
  }

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
        <FolderList
          folders={folders}
          changeDirectory={onFolderClick}
          deleteFolder={(folder) => handleDeleteFolder(folder, rp)}
          handleCopy={(folder) => handleCopy(folder, true)}
        />

        <FileListFile
          files={files}
          handleFileDownload={(name) => handleFileDownload(name, rp)}
          handleFileShareLink={(name) => handleFileShareLink(name, rp)}
          handleFileDelete={(name) => handleFileDelete(name, rp)}
          handleFileCopy={(name) => handleCopy(name, false)}
          handleFileCut={(name) => handleCut(name)}
          handleRenameFile={(name, newname) => handleRenameFile(name, newname, rp)}
          handleFolderCopy={(name) => handleFolderCopy(name)}
          handleFilePaste={(name) => handlePaste(name)}
        />
      </VStack>
    </Box>
  );
};

export default FileDisplay;
