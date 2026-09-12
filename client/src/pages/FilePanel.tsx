import { useEffect, useState } from "react";

import {
  Box,
  Flex,
  IconButton,
  Tooltip,
  useBreakpointValue,
} from "@chakra-ui/react";

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
import type { FileBrowser, FileUploadProps } from "../types/fileBrowser";
import type { AppToast } from "../hooks/useAppToast";
const SHORT_SCREEN_HEIGHT = 800;
const UPLOAD_MODE_KEY = "uploadMode";

const UploadMode = {
  DRAG_DROP: "dragdrop",
  COMPACT: "compact",
} as const;

type UploadModeValue = (typeof UploadMode)[keyof typeof UploadMode];

interface FilePanelProps {
  browser: FileBrowser;

  onOpenFile: (filename: string, isNew?: boolean) => void | Promise<void>;

  fileUploadProps: FileUploadProps;
  toast: AppToast;
}

interface UploadModeToggleProps {
  mode: UploadModeValue;
  onToggle: () => void;
}

const isUploadMode = (value: string | null): value is UploadModeValue => {
  return value === UploadMode.DRAG_DROP || value === UploadMode.COMPACT;
};

const FilePanel = ({
  browser,
  onOpenFile,
  fileUploadProps,
  toast,
}: FilePanelProps) => {
  const {
    files,
    openFolder,
    changeDirectory,

    downloadFile,
    downloadFolder,
    deleteFile,
    deleteFiles,
    renameFile,
    shareFile,

    copyFile,
    cutFile,
    paste,

    createFolder,
    deleteFolder,
    copyFolder,

    breadcrumbs,

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

  const [uploadMode, setUploadMode] = useState<UploadModeValue>(() => {
    const savedMode = localStorage.getItem(UPLOAD_MODE_KEY);

    return isUploadMode(savedMode) ? savedMode : UploadMode.DRAG_DROP;
  });

  useEffect(() => {
    const updateScreenHeight = (): void => {
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

  const toggleUploadMode = (): void => {
    const nextMode: UploadModeValue =
      uploadMode === UploadMode.DRAG_DROP
        ? UploadMode.COMPACT
        : UploadMode.DRAG_DROP;

    setUploadMode(nextMode);
    localStorage.setItem(UPLOAD_MODE_KEY, nextMode);
  };

  const hasClipboardItems = clipboard.length > 0;

  const hasTransfers =
    Object.keys(startedTransfers).length > 0 &&
    Object.keys(progressMap).length > 0;

  const folders = files.folders;
  const fileEntries = files.files;

  const createNewFile = (filename: string): void => {
    const trimmedName = filename.trim();

    const nameExists =
      fileEntries.some((file) => file.name === trimmedName) ||
      folders.some((folder) => folder.name === trimmedName);

    if (nameExists) {
      toast({
        title: "File already exists",
        description: `"${trimmedName}" already exists in this folder.`,
        status: "error",
      });

      return;
    }

    void onOpenFile(trimmedName, true);
  };

  return (
    <Flex direction="column" h="100%" minH={0} overflow="hidden">
      {showDropZone && (
        <Box
          flexShrink={0}
          px={{
            base: 3,
            md: 5,
          }}
          py={4}
          bg="rgba(255,255,255,0.008)"
          borderBottom="1px solid"
          borderColor="rgba(255,255,255,0.055)"
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
        px={{
          base: 3,
          md: 5,
        }}
        py={forceCompact ? 2 : "10px"}
        minH="48px"
        flexShrink={0}
        flexWrap="wrap"
        bg="rgba(255,255,255,0.014)"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.06)"
      >
        <Box
          flex={1}
          minW="180px"
          minH="28px"
          display="flex"
          alignItems="center"
        >
          <Breadcrumbs breadcrumb={breadcrumbs} onClick={changeDirectory} />
        </Box>

        <Flex align="center" gap="6px" flexShrink={0}>
          {showCompactUpload && (
            <Upload
              apiEndpoint={apiEndpoint}
              additionalData={additionalData}
              onUploadSuccess={onUploadSuccess}
            />
          )}

          <CreateFolderComponent handleCreateFolder={createFolder} />

          <CreateFileComponent onOpenFile={createNewFile} />

          {!forceCompact && (
            <UploadModeToggle mode={uploadMode} onToggle={toggleUploadMode} />
          )}
        </Flex>
      </Flex>

      {hasTransfers && (
        <Box
          px={{
            base: 3,
            md: 5,
          }}
          pt={3}
          flexShrink={0}
        >
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

      <Box flex={1} minH={0} overflowY="auto" overflowX="hidden">
        <FolderList
          folders={folders}
          openFolder={openFolder}
          deleteFolder={deleteFolder}
          downloadFolder={downloadFolder}
          copyFolder={copyFolder}
        />

        <FileList
          files={fileEntries}
          downloadFile={downloadFile}
          deleteFile={deleteFile}
          deleteFiles={deleteFiles}
          shareFile={shareFile}
          renameFile={renameFile}
          copyFile={copyFile}
          cutFile={cutFile}
          openFile={onOpenFile}
        />
      </Box>
    </Flex>
  );
};

const UploadModeToggle = ({ mode, onToggle }: UploadModeToggleProps) => {
  const showingDropZone = mode === UploadMode.DRAG_DROP;
  const label = showingDropZone ? "Hide drop zone" : "Show drop zone";

  return (
    <Tooltip label={label} hasArrow openDelay={400}>
      <IconButton
        aria-label={label}
        title={label}
        icon={
          showingDropZone ? <FiUploadCloud size={13} /> : <FiUpload size={13} />
        }
        size="sm"
        minW="28px"
        w="28px"
        h="28px"
        borderRadius="7px"
        border="1px solid"
        borderColor={
          showingDropZone ? "rgba(129,140,248,0.22)" : "rgba(255,255,255,0.08)"
        }
        bg={
          showingDropZone ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.02)"
        }
        color={showingDropZone ? "#A5B4FC" : "rgba(255,255,255,0.38)"}
        transition="
          background 120ms ease,
          border-color 120ms ease,
          color 120ms ease
        "
        _hover={{
          bg: showingDropZone
            ? "rgba(129,140,248,0.13)"
            : "rgba(255,255,255,0.055)",
          borderColor: showingDropZone
            ? "rgba(129,140,248,0.34)"
            : "rgba(255,255,255,0.13)",
          color: showingDropZone ? "#A5B4FC" : "rgba(255,255,255,0.7)",
        }}
        _active={{
          bg: showingDropZone
            ? "rgba(129,140,248,0.17)"
            : "rgba(255,255,255,0.075)",
        }}
        onClick={onToggle}
      />
    </Tooltip>
  );
};

export default FilePanel;
