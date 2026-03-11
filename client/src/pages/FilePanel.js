import React, { useState, useEffect } from "react";
import { Box, Flex, Icon, Tooltip } from "@chakra-ui/react";
import { FiUpload, FiUploadCloud } from "react-icons/fi";
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
import { useBreakpointValue } from "@chakra-ui/react";

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
  const { apiEndpoint, additionalData, onUploadSuccess } = fileUploadProps;

  const isCompact =
    useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? false;

  const [isShortScreen, setIsShortScreen] = useState(
    () => window.innerHeight < 800,
  );

  // Persisted upload mode — "dragdrop" or "compact"
  const [uploadMode, setUploadMode] = useState(
    () => localStorage.getItem("uploadMode") ?? "dragdrop",
  );

  useEffect(() => {
    const handleResize = () => setIsShortScreen(window.innerHeight < 800);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const forceCompact = isCompact || isShortScreen;
  const showDragDrop = !forceCompact && uploadMode === "dragdrop";

  const toggleUploadMode = () => {
    const next = uploadMode === "dragdrop" ? "compact" : "dragdrop";
    setUploadMode(next);
    localStorage.setItem("uploadMode", next);
  };

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Upload zone — large screens, dragdrop mode only */}
      {showDragDrop && (
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

      {/* Breadcrumb + toolbar */}
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={{ base: 3, md: 5 }}
        py={forceCompact ? 2 : 3}
        borderBottom="1px solid rgba(255,255,255,0.05)"
        flexWrap="wrap"
      >
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={changeDirectory}
        />
        <Flex align="center" gap={2}>
          {/* Always show compact upload when dragdrop is hidden */}
          {(forceCompact || uploadMode === "compact") && (
            <Upload
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          )}
          <CreateFolderComponent handleCreateFolder={onCreateFolder} />
          <CreateFileComponent onOpenFile={(name) => onOpenFile(name, true)} />

          {/* Toggle upload mode — only on large screens */}
          {!forceCompact && (
            <Tooltip
              label={
                uploadMode === "dragdrop" ? "Hide drop zone" : "Show drop zone"
              }
              hasArrow
              openDelay={400}
            >
              <Flex
                w="28px"
                h="28px"
                align="center"
                justify="center"
                borderRadius="6px"
                cursor="pointer"
                border="1px solid"
                borderColor={
                  uploadMode === "dragdrop"
                    ? "rgba(99,102,241,0.35)"
                    : "rgba(255,255,255,0.08)"
                }
                bg={
                  uploadMode === "dragdrop"
                    ? "rgba(99,102,241,0.12)"
                    : "transparent"
                }
                color={
                  uploadMode === "dragdrop"
                    ? "#818CF8"
                    : "rgba(255,255,255,0.3)"
                }
                transition="all 0.12s"
                _hover={{
                  borderColor:
                    uploadMode === "dragdrop"
                      ? "rgba(99,102,241,0.5)"
                      : "rgba(255,255,255,0.18)",
                  color:
                    uploadMode === "dragdrop"
                      ? "#A5B4FC"
                      : "rgba(255,255,255,0.7)",
                }}
                onClick={toggleUploadMode}
              >
                <Icon
                  as={uploadMode === "dragdrop" ? FiUploadCloud : FiUpload}
                  boxSize="13px"
                />
              </Flex>
            </Tooltip>
          )}
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
      <Box flex={1} overflow="auto">
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
