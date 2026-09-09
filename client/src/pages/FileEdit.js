import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text, Icon } from "@chakra-ui/react";
import { FiSave, FiMonitor, FiServer, FiFile } from "react-icons/fi";

import apiClient from "../services/apiClient";
import FileViewer from "../components/fileViewer/FileViewer";

const VIDEO_EXTS = new Set(["mp4", "webm", "ogg"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg"]);
const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

const getExt = (filename) =>
  filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";

const getFileType = (filename) => {
  const ext = getExt(filename);
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (IMAGE_RE.test(filename)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "epub") return "epub";
  return "text";
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SaveButton = ({ saving, onClick }) => (
  <Flex
    align="center"
    gap="6px"
    px={3}
    h="28px"
    borderRadius="6px"
    bg={saving ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.15)"}
    border="1px solid rgba(99,102,241,0.3)"
    color="#818CF8"
    cursor={saving ? "wait" : "pointer"}
    fontSize="12px"
    fontWeight={600}
    transition="all 0.12s"
    _hover={{
      bg: "rgba(99,102,241,0.25)",
      borderColor: "rgba(99,102,241,0.5)",
    }}
    onClick={!saving ? onClick : undefined}
    flexShrink={0}
  >
    <Icon as={FiSave} boxSize="12px" />
    {saving ? "Saving…" : "Save"}
  </Flex>
);

const FileHeader = ({
  remote,
  host,
  currentDirectory,
  filename,
  saving,
  onSave,
  showSave,
}) => (
  <Flex
    align="center"
    gap={4}
    px={5}
    h="48px"
    borderBottom="1px solid rgba(255,255,255,0.07)"
    bg="gray.800"
    flexShrink={0}
  >
    {/* Host badge */}
    <Flex align="center" gap={2}>
      <Icon
        as={remote ? FiServer : FiMonitor}
        boxSize="12px"
        color="rgba(255,255,255,0.25)"
      />
      <Text
        fontSize="12px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.4)"
      >
        {remote ? host : "local"}
      </Text>
    </Flex>

    <Icon as={FiFile} boxSize="11px" color="rgba(255,255,255,0.15)" />

    {/* Path + filename */}
    <Flex align="center" minW={0} flex={1}>
      <Text
        fontSize="12px"
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.3)"
        noOfLines={1}
      >
        {currentDirectory}
      </Text>
      <Text
        fontSize="12px"
        fontWeight={600}
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.8)"
        flexShrink={0}
      >
        {filename}
      </Text>
    </Flex>

    {showSave && <SaveButton saving={saving} onClick={onSave} />}
  </Flex>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

    return serverId
      ? `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`
      : `/api/download/${currentDirectory}/${filename}`;
  };
  const streamUrl = `/api/downloadstream/${currentDirectory}/${filename}`;

  // Fetch file and create a typed object URL for binary types
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

  // Stream text file content progressively into the editor
  const streamTextFile = async (signal) => {
    const response = await apiClient.getResponse(buildUrl(), { signal });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let result = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      result += decoder.decode(value, {
        stream: true,
      });

      setText(result);
    }

    result += decoder.decode();
    setText(result);
  };

  const fetchEpub = async (signal) => {
    const buffer = await apiClient.getArrayBuffer(buildUrl(), { signal });

    setEpubData(buffer);
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setText("");
    setObjectUrl(null);
    setEpubData(null);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const loadFile = async () => {
      if (isNew) return;

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

          // Audio/video are loaded directly by their elements.
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

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
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
        new Blob([text], { type: "text/plain" }),
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
    <Box h="100%" display="flex" flexDirection="column" bg="gray.800">
      <FileHeader
        remote={remote}
        host={host}
        currentDirectory={currentDirectory}
        filename={filename}
        saving={saving}
        onSave={saveFile}
        showSave={fileType === "text" && !readOnly}
      />

      <Box flex={1} overflow="auto">
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
    </Box>
  );
};

export default FileEdit;
