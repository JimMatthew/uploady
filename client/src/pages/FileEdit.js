import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Icon, Text } from "@chakra-ui/react";
import { FiFile, FiMonitor, FiSave, FiServer } from "react-icons/fi";

import apiClient from "../services/apiClient";
import FileViewer from "../components/fileViewer/FileViewer";

const VIDEO_EXTS = new Set(["mp4", "webm", "ogg"]);

const AUDIO_EXTS = new Set(["mp3", "wav", "ogg"]);

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

const getExt = (filename) =>
  filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";

const getFileType = (filename) => {
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

const SaveButton = ({ saving, onClick }) => {
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
      onClick={onClick}
    >
      Save
    </Button>
  );
};

const FileHeader = ({
  remote,
  host,
  currentDirectory,
  filename,
  saving,
  onSave,
  showSave,
}) => {
  return (
    <Flex
      align="center"
      gap={3}
      px={{ base: 3, md: 5 }}
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
          {remote ? host : "local"}
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
}) => {
  const [text, setText] = useState("");
  const [objectUrl, setObjectUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [epubData, setEpubData] = useState(null);

  const objectUrlRef = useRef(null);

  const fileType = getFileType(filename);

  const buildUrl = () => {
    if (source?.type === "archive") {
      const params = new URLSearchParams({
        path: source.archivePath,
        entry: source.entry,
      });

      return `/api/archive/local/entry?${params}`;
    }

    if (serverId) {
      return `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`;
    }

    return `/api/download/${currentDirectory}/${filename}`;
  };

  const streamUrl = `/api/downloadstream/${currentDirectory}/${filename}`;

  const clearObjectUrl = () => {
    if (!objectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  const fetchAsObjectUrl = async (mimeType, signal) => {
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

  const streamTextFile = async (signal) => {
    const response = await apiClient.getResponse(buildUrl(), {
      signal,
    });

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

  const fetchEpub = async (signal) => {
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

    const loadFile = async () => {
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
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to load file:", err);
        }
      }
    };

    loadFile();

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
    source?.archivePath,
    source?.entry,
  ]);

  const saveFile = async () => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      if (remote) {
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
        isClosable: true,
      });
    } catch (err) {
      console.error("Failed to save file:", err);

      toast({
        title: "Save failed",
        description: err.message,
        status: "error",
        duration: 2000,
        isClosable: true,
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
          objectUrl={objectUrl}
          epubData={epubData}
          streamUrl={streamUrl}
          readOnly={readOnly}
        />
      </Box>
    </Flex>
  );
};

export default FileEdit;
