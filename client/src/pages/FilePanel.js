import React, { useState, useEffect } from "react";
import { Box, Flex, useBreakpointValue } from "@chakra-ui/react";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/UploadComponent";
import DragAndDropComponent from "../components/DragDropComponent";
import CreateFolderComponent from "../components/CreateFolderComponent";
import FolderList from "../components/FolderList";
import FileList from "../components/FileListFiles";
import TransferProgress from "../components/TransferProgress";
import CreateFileComponent from "../components/CreateFileComponent";
import ClipboardComponent from "../components/ClipboardComponent";
import { useClipboard } from "../contexts/ClipboardContext";
const FilePanel = ({
  files,
  handleDownload,
  onChangeDirectory,
  onDeleteFolder,
  handleDownloadFolder,
  onFolderCopy,
  handleDelete,
  handleShare,
  handleRename,
  handleCopy,
  handleCut,
  handlePaste,
  onOpenFile,
  changeDirectory,
  onCreateFolder,
  startedTransfers,
  progressMap,
  generateBreadcrumb,
  fileUploadProps,
}) => {
  const { clipboard } = useClipboard();
  const isMobile =
    useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? false;
  const { apiEndpoint, additionalData, onUploadSuccess } = fileUploadProps;

  const isCompact =
    useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? false;

  const [isShortScreen, setIsShortScreen] = useState(
    () => window.innerHeight < 800,
  );

  useEffect(() => {
    const handleResize = () => setIsShortScreen(window.innerHeight < 800);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const useCompactUpload = isCompact || isShortScreen;
  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Upload zone */}

      {/* Upload zone — only on large screens */}
      {!useCompactUpload && (
        <Box
          px={{ base: 3, md: 5 }}
          py={4}
          borderBottom="1px solid rgba(255,255,255,0.06)"
        >
          <Flex justify="center">
            <DragAndDropComponent
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          </Flex>
        </Box>
      )}

      {/* Breadcrumb + toolbar — single row on compact */}
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={{ base: 3, md: 5 }}
        py={useCompactUpload ? 2 : 3}
        borderBottom="1px solid rgba(255,255,255,0.05)"
        flexWrap="wrap"
      >
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={changeDirectory}
        />
        <Flex align="center" gap={2}>
          {useCompactUpload && (
            <Upload
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          )}
          <CreateFolderComponent handleCreateFolder={onCreateFolder} />
          <CreateFileComponent onOpenFile={(name) => onOpenFile(name, true)} />
        </Flex>
      </Flex>

      {/* Transfer progress */}
      {startedTransfers && progressMap && (
        <Box px={{ base: 3, md: 5 }} pt={3}>
          <TransferProgress
            transfers={startedTransfers}
            progressMap={progressMap}
          />
        </Box>
      )}

      {clipboard[0] && <ClipboardComponent handlePaste={handlePaste} />}
      
      {/* File browser */}
      <Box flex={1} overflow="auto" px={{ base: 0, md: 0 }}>
        <FolderList
          folders={files.folders}
          changeDirectory={onChangeDirectory}
          deleteFolder={onDeleteFolder}
          downloadFolder={handleDownloadFolder}
          handleCopy={onFolderCopy}
        />
        <FileList
          files={files.files}
          handleFileDownload={handleDownload}
          handleFileDelete={handleDelete}
          handleFileShareLink={handleShare}
          handleRenameFile={handleRename}
          handleFileCopy={handleCopy}
          handleFileCut={handleCut}
          handleOpenFile={onOpenFile}
        />
      </Box>
    </Box>
  );
};

export default FilePanel;
