import { useEffect, useRef, useState } from "react";
import type { MouseEventHandler } from "react";
import { Box, Button, Flex, Icon, Text } from "@chakra-ui/react";
import { FiFile, FiMonitor, FiSave, FiServer } from "react-icons/fi";
import apiClient from "../services/apiClient";
import FileViewer from "../components/fileViewer/FileViewer";
import type { FileViewerType } from "../components/fileViewer/FileViewer";
import type { AppToast } from "../hooks/useAppToast";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ArchiveSource {
  type: "archive";
  archivePath: string;
  entry: string;
}

interface LocalSource {
  type: "local";
}

interface SftpSource {
  type: "sftp";
  serverId?: string;
  currentDirectory?: string;
  host?: string;
}

type FileEditSource = ArchiveSource | LocalSource | SftpSource;

interface FileEditProps {
  serverId?: string;
  currentDirectory: string;
  filename: string;
  toast: AppToast;
  host?: string;
  remote?: boolean;
  isNew?: boolean;
  source?: FileEditSource;
  readOnly?: boolean;
}

interface SaveButtonProps {
  saving: boolean;
  onClick: () => void | Promise<void>;
}

interface FileHeaderProps {
  remote: boolean;
  host?: string;
  currentDirectory: string;
  filename: string;
  saving: boolean;
  onSave: () => void | Promise<void>;
  showSave: boolean;
}

// -----------------------------------------------------------------------------
// File type detection
// -----------------------------------------------------------------------------

const VIDEO_EXTS = new Set(["mp4", "webm", "ogg"]);

const AUDIO_EXTS = new Set(["mp3", "wav", "ogg"]);

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

const getExt = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }

  return filename.slice(lastDot + 1).toLowerCase();
};

const getFileType = (filename: string): FileViewerType => {
  const ext = getExt(filename);

  if (VIDEO_EXTS.has(ext)) {
    return "video";
  }

  if (AUDIO_EXTS.has(ext)) {
    return "audio";
  }

  if (IMAGE_RE.test(filename)) {
    return "image";
  }

  if (ext === "pdf") {
    return "pdf";
  }

  if (ext === "epub") {
    return "epub";
  }

  return "text";
};

// -----------------------------------------------------------------------------
// Save button
// -----------------------------------------------------------------------------

const SaveButton = ({ saving, onClick }: SaveButtonProps) => {
  const handleClick: MouseEventHandler<HTMLButtonElement> = () => {
    void onClick();
  };

  return (
    <Button
      h="30px"
      px={3}
      flexShrink={0}
      leftIcon={<FiSave size={12} />}
      borderRadius="7px"
      border="1px solid"
      borderColor="rgba(129,140,248,0.24)"
      bg="rgba(129,140,248,0.11)"
      color="#A5B4FC"
      fontSize="11px"
      fontWeight={600}
      isLoading={saving}
      loadingText="Saving"
      spinnerPlacement="start"
      transition="
        background 120ms ease,
        border-color 120ms ease
      "
      _hover={{
        bg: "rgba(129,140,248,0.17)",
        borderColor: "rgba(129,140,248,0.34)",
      }}
      _active={{
        bg: "rgba(129,140,248,0.21)",
      }}
      onClick={handleClick}
    >
      Save
    </Button>
  );
};

// -----------------------------------------------------------------------------
// Header
// -----------------------------------------------------------------------------

const FileHeader = ({
  remote,
  host,
  currentDirectory,
  filename,
  saving,
  onSave,
  showSave,
}: FileHeaderProps) => {
  return (
    <Flex
      align="center"
      gap={3}
      px={{
        base: 3,
        md: 5,
      }}
      h="48px"
      minH="48px"
      flexShrink={0}
      bg="rgba(255,255,255,0.014)"
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.06)"
    >
      <Flex
        align="center"
        gap="6px"
        flexShrink={0}
        px="7px"
        h="26px"
        borderRadius="6px"
        bg="rgba(255,255,255,0.025)"
        border="1px solid"
        borderColor="rgba(255,255,255,0.06)"
      >
        <Icon
          as={remote ? FiServer : FiMonitor}
          boxSize="11px"
          color={remote ? "#7BC8D8" : "rgba(255,255,255,0.38)"}
        />

        <Text
          fontSize="10px"
          fontWeight={500}
          fontFamily="'JetBrains Mono', monospace"
          color="rgba(255,255,255,0.42)"
          whiteSpace="nowrap"
        >
          {remote ? (host ?? "remote") : "local"}
        </Text>
      </Flex>

      <Box w="1px" h="18px" flexShrink={0} bg="rgba(255,255,255,0.07)" />

      <Icon
        as={FiFile}
        boxSize="11px"
        flexShrink={0}
        color="rgba(255,255,255,0.22)"
      />

      <Flex align="center" flex={1} minW={0} overflow="hidden">
        {currentDirectory && (
          <Text
            minW={0}
            noOfLines={1}
            fontSize="11px"
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.28)"
          >
            {currentDirectory}
          </Text>
        )}

        <Text
          flexShrink={0}
          ml={currentDirectory ? "2px" : 0}
          fontSize="11px"
          fontWeight={600}
          fontFamily="'JetBrains Mono', monospace"
          color="rgba(255,255,255,0.82)"
          whiteSpace="nowrap"
        >
          {filename}
        </Text>
      </Flex>

      {showSave && <SaveButton saving={saving} onClick={onSave} />}
    </Flex>
  );
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const FileEdit = ({
  serverId,
  currentDirectory,
  filename,
  toast,
  host,
  remote = true,
  isNew = false,
  source,
  readOnly = false,
}: FileEditProps) => {
  const [text, setText] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileType = getFileType(filename);

  const buildUrl = (): string => {
    if (source?.type === "archive") {
      const archiveSource = source as ArchiveSource;

      const params = new URLSearchParams({
        path: archiveSource.archivePath,
        entry: archiveSource.entry,
      });

      return `/api/archive/local/entry?${params}`;
    }

    if (serverId) {
      return `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`;
    }

    return `/api/download/${currentDirectory}/${filename}`;
  };

  const streamUrl = `/api/downloadstream/${currentDirectory}/${filename}`;

  const clearObjectUrl = (): void => {
    const url = objectUrlRef.current;

    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);

    objectUrlRef.current = null;
  };

  const fetchAsObjectUrl = async (
    mimeType: string,
    signal: AbortSignal,
  ): Promise<void> => {
    const blob = await apiClient.getBlob(buildUrl(), {
      signal,
    });

    const typedBlob = new Blob([blob], {
      type: mimeType,
    });

    const url = URL.createObjectURL(typedBlob);

    objectUrlRef.current = url;

    setObjectUrl(url);
  };

  const streamTextFile = async (signal: AbortSignal): Promise<void> => {
    const response = await apiClient.getResponse(buildUrl(), {
      signal,
    });

    if (!response.body) {
      throw new Error("Response body is unavailable");
    }

    const reader = response.body.getReader();

    const decoder = new TextDecoder();

    let result = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      result += decoder.decode(value, {
        stream: true,
      });

      setText(result);
    }

    result += decoder.decode();

    setText(result);
  };

  const fetchEpub = async (signal: AbortSignal): Promise<void> => {
    const buffer = await apiClient.getArrayBuffer(buildUrl(), {
      signal,
    });

    setEpubData(buffer);
  };

  useEffect(() => {
    const controller = new AbortController();

    const { signal } = controller;

    setText("");
    setObjectUrl(null);
    setEpubData(null);

    clearObjectUrl();

    const loadFile = async (): Promise<void> => {
      if (isNew) {
        return;
      }

      try {
        switch (fileType) {
          case "image":
            await fetchAsObjectUrl("image/*", signal);
            break;

          case "pdf":
            await fetchAsObjectUrl("application/pdf", signal);
            break;

          case "epub":
            await fetchEpub(signal);
            break;

          case "text":
            await streamTextFile(signal);
            break;

          // Audio and video are loaded directly
          // by their respective viewer elements.
          default:
            break;
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load file:", error);
      }
    };

    void loadFile();

    return () => {
      controller.abort();
      clearObjectUrl();
    };
  }, [
    serverId,
    currentDirectory,
    filename,
    fileType,
    isNew,
    source?.type,
    source?.type === "archive" ? source.archivePath : undefined,
    source?.type === "archive" ? source.entry : undefined,
  ]);

  const saveFile = async (): Promise<void> => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      if (remote) {
        if (!serverId) {
          throw new Error("Server ID is required for remote files");
        }

        formData.append("currentDirectory", currentDirectory);

        formData.append("serverId", serverId);
      } else {
        formData.append("folderPath", currentDirectory);
      }

      formData.append(
        "files",
        new Blob([text], {
          type: "text/plain",
        }),
        filename,
      );

      await apiClient.postForm(
        remote ? "/sftp/api/upload" : "/api/upload",
        formData,
      );

      toast({
        title: "Saved",
        status: "success",
        duration: 2000,
      });
    } catch (error: unknown) {
      console.error("Failed to save file:", error);

      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 2000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flex direction="column" h="100%" minH={0} overflow="hidden" bg="#1B1F2A">
      <FileHeader
        remote={remote}
        host={host}
        currentDirectory={currentDirectory}
        filename={filename}
        saving={saving}
        onSave={saveFile}
        showSave={fileType === "text" && !readOnly}
      />

      <Box flex={1} minH={0} overflow="auto">
        <FileViewer
          fileType={fileType}
          filename={filename}
          text={text}
          setText={setText}
          objectUrl={objectUrl ?? undefined}
          epubData={epubData ?? undefined}
          streamUrl={streamUrl}
          readOnly={readOnly}
        />
      </Box>
    </Flex>
  );
};

export default FileEdit;
