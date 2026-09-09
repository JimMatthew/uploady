import React, { useEffect, useState } from "react";
import { Box, Flex, Icon, Tooltip, useBreakpointValue } from "@chakra-ui/react";
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

const SHORT_SCREEN_HEIGHT = 800;
const UPLOAD_MODE_KEY = "uploadMode";

const UploadMode = {
  DRAG_DROP: "dragdrop",
  COMPACT: "compact",
};

/**
 * Shared file browser UI for local and SFTP sources.
 *
 * @param {Object} props
 * @param {import("../types/fileBrowser").FileBrowser} props.browser
 * @param {(filename: string, isNew?: boolean) => void} props.onOpenFile
 * @param {Object} props.fileUploadProps
 * @param {string} props.fileUploadProps.apiEndpoint
 * @param {Object} props.fileUploadProps.additionalData
 * @param {() => void} props.fileUploadProps.onUploadSuccess
 */
const FilePanel = ({ browser, onOpenFile, fileUploadProps }) => {
  const {
    files,
    openFolder,
    changeDirectory,

    downloadFile,
    downloadFolder,
    deleteFile,
    renameFile,
    shareFile,

    copyFile,
    cutFile,
    paste,

    createFolder,
    deleteFolder,
    copyFolder,

    generateBreadcrumb,

    progressMap,
    startedTransfers,
  } = browser;

  const { apiEndpoint, additionalData, onUploadSuccess } = fileUploadProps;
  const { clipboard } = useClipboard();

  const isCompactViewport =
    useBreakpointValue(
      {
        base: true,
        md: false,
      },
      {
        ssr: false,
      },
    ) ?? false;

  const [isShortScreen, setIsShortScreen] = useState(false);

  const [uploadMode, setUploadMode] = useState(() => {
    const savedMode = localStorage.getItem(UPLOAD_MODE_KEY);

    return Object.values(UploadMode).includes(savedMode)
      ? savedMode
      : UploadMode.DRAG_DROP;
  });

  useEffect(() => {
    const updateScreenHeight = () => {
      setIsShortScreen(window.innerHeight < SHORT_SCREEN_HEIGHT);
    };

    updateScreenHeight();
    window.addEventListener("resize", updateScreenHeight);

    return () => {
      window.removeEventListener("resize", updateScreenHeight);
    };
  }, []);

  const forceCompact = isCompactViewport || isShortScreen;
  const showDropZone = !forceCompact && uploadMode === UploadMode.DRAG_DROP;
  const showCompactUpload = forceCompact || uploadMode === UploadMode.COMPACT;

  const toggleUploadMode = () => {
    const nextMode =
      uploadMode === UploadMode.DRAG_DROP
        ? UploadMode.COMPACT
        : UploadMode.DRAG_DROP;

    setUploadMode(nextMode);
    localStorage.setItem(UPLOAD_MODE_KEY, nextMode);
  };

  const breadcrumb = generateBreadcrumb(files.currentDirectory || "/");
  const hasClipboardItems = clipboard.length > 0;
  const hasTransfers = Boolean(startedTransfers && progressMap);

  return (
    <Box h="100%" display="flex" flexDirection="column" minH={0}>
      {showDropZone && (
        <Box
          px={{ base: 3, md: 5 }}
          py={4}
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          bg="rgba(255,255,255,0.01)"
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

      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={{ base: 3, md: 5 }}
        py={forceCompact ? 2 : 3}
        minH="48px"
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        bg="rgba(255,255,255,0.012)"
        flexWrap="wrap"
      >
        <Box flex={1} minW="180px">
          <Breadcrumbs breadcrumb={breadcrumb} onClick={changeDirectory} />
        </Box>

        <Flex align="center" gap={1.5} flexShrink={0}>
          {showCompactUpload && (
            <Upload
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          )}

          <CreateFolderComponent handleCreateFolder={createFolder} />

          <CreateFileComponent onOpenFile={(name) => onOpenFile(name, true)} />

          {!forceCompact && (
            <UploadModeToggle mode={uploadMode} onToggle={toggleUploadMode} />
          )}
        </Flex>
      </Flex>

      {hasTransfers && (
        <Box px={{ base: 3, md: 5 }} pt={3} flexShrink={0}>
          <TransferProgress
            transfers={startedTransfers}
            progressMap={progressMap}
          />
        </Box>
      )}

      {hasClipboardItems && (
        <Box flexShrink={0}>
          <ClipboardComponent handlePaste={paste} />
        </Box>
      )}

      <Box flex={1} minH={0} overflow="auto">
        <FolderList
          folders={files.folders}
          openFolder={openFolder}
          deleteFolder={deleteFolder}
          downloadFolder={downloadFolder}
          copyFolder={copyFolder}
        />

        <FileList
          files={files.files}
          downloadFile={downloadFile}
          deleteFile={deleteFile}
          shareFile={shareFile}
          renameFile={renameFile}
          copyFile={copyFile}
          cutFile={cutFile}
          openFile={onOpenFile}
        />
      </Box>
    </Box>
  );
};

const UploadModeToggle = ({ mode, onToggle }) => {
  const showingDropZone = mode === UploadMode.DRAG_DROP;
  const label = showingDropZone ? "Hide drop zone" : "Show drop zone";

  return (
    <Tooltip label={label} hasArrow openDelay={400}>
      <Flex
        as="button"
        type="button"
        w="28px"
        h="28px"
        align="center"
        justify="center"
        flexShrink={0}
        borderRadius="6px"
        border="1px solid"
        borderColor={
          showingDropZone ? "rgba(99,102,241,0.35)" : "whiteAlpha.100"
        }
        bg={showingDropZone ? "rgba(99,102,241,0.12)" : "transparent"}
        color={showingDropZone ? "#818CF8" : "whiteAlpha.400"}
        transition="background 120ms ease, border-color 120ms ease, color 120ms ease"
        _hover={{
          borderColor: showingDropZone
            ? "rgba(129,140,248,0.5)"
            : "whiteAlpha.200",
          bg: showingDropZone ? "rgba(99,102,241,0.16)" : "whiteAlpha.50",
          color: showingDropZone ? "#A5B4FC" : "whiteAlpha.700",
        }}
        _active={{
          bg: showingDropZone ? "rgba(99,102,241,0.2)" : "whiteAlpha.100",
        }}
        onClick={onToggle}
        aria-label={label}
        title={label}
      >
        <Icon as={showingDropZone ? FiUploadCloud : FiUpload} boxSize="13px" />
      </Flex>
    </Tooltip>
  );
};

export default FilePanel;
