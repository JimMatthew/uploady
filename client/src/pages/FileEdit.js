import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Box, Flex, Text, Icon } from "@chakra-ui/react";
import { githubDark } from "@uiw/codemirror-theme-github";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { cpp } from "@codemirror/lang-cpp";
import { FiSave, FiMonitor, FiServer, FiFile } from "react-icons/fi";
import ImageViewer from "../components/ImageViewer";
import EpubViewer from "../components/EpubViewer";
import apiClient from "../services/apiClient";
const EXT_LANG = {
  js: () => javascript({ jsx: true }),
  ts: () => javascript({ jsx: true, typescript: true }),
  java: () => java(),
  json: () => json(),
  rs: () => rust(),
  html: () => html(),
  cpp: () => cpp(),
  c: () => cpp(),
};

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

const getLanguageExtension = (filename) =>
  EXT_LANG[getExt(filename)]?.() ?? null;

const EDITOR_STYLES = {
  ".cm-editor": {
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    bg: "transparent",
  },
  ".cm-editor.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace" },
  ".cm-gutters": {
    bg: "rgba(255,255,255,0.02)",
    borderRight: "1px solid rgba(255,255,255,0.07)",
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const VideoPlayer = ({ src }) => (
  <Box bg="#000" borderRadius="8px" overflow="hidden">
    <video controls style={{ width: "100%", display: "block" }} src={src}>
      Video not supported
    </video>
  </Box>
);

const AudioPlayer = ({ src, filename }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="100%"
      gap={6}
      px={8}
    >
      {/* Album art placeholder */}
      <Box
        w="120px"
        h="120px"
        borderRadius="16px"
        bg="rgba(99,102,241,0.08)"
        border="1px solid rgba(99,102,241,0.2)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 8px 32px rgba(0,0,0,0.3)"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="rgba(99,102,241,0.4)"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="12" r="3" fill="#6366F1" fillOpacity="0.6" />
          <circle cx="12" cy="12" r="1" fill="#818CF8" />
        </svg>
      </Box>

      {/* Filename */}
      <Text
        fontSize="13px"
        fontWeight={600}
        fontFamily="'JetBrains Mono', monospace"
        color="rgba(255,255,255,0.7)"
        letterSpacing="-0.01em"
        noOfLines={1}
        maxW="320px"
      >
        {filename}
      </Text>

      {/* Progress bar */}
      <Box w="100%" maxW="360px">
        <Box
          w="100%"
          h="3px"
          bg="rgba(255,255,255,0.07)"
          borderRadius="full"
          cursor="pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = pct * duration;
          }}
        >
          <Box
            h="100%"
            borderRadius="full"
            bg="linear-gradient(90deg, #6366F1, #818CF8)"
            w={`${progress}%`}
            transition="width 0.1s linear"
          />
        </Box>
        <Flex justify="space-between" mt="6px">
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {formatTime(currentTime)}
          </Text>
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {formatTime(duration)}
          </Text>
        </Flex>
      </Box>

      {/* Play/pause */}
      <Flex
        w="44px"
        h="44px"
        align="center"
        justify="center"
        borderRadius="full"
        bg={playing ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)"}
        border="1px solid"
        borderColor={playing ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}
        cursor="pointer"
        transition="all 0.15s"
        _hover={{
          bg: playing ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)",
          borderColor: playing
            ? "rgba(99,102,241,0.6)"
            : "rgba(255,255,255,0.2)",
        }}
        onClick={toggle}
      >
        {playing ? (
          // Pause icon
          <Flex gap="3px">
            <Box
              w="3px"
              h="14px"
              borderRadius="2px"
              bg={playing ? "#818CF8" : "rgba(255,255,255,0.6)"}
            />
            <Box
              w="3px"
              h="14px"
              borderRadius="2px"
              bg={playing ? "#818CF8" : "rgba(255,255,255,0.6)"}
            />
          </Flex>
        ) : (
          // Play icon
          <Box
            borderStyle="solid"
            borderColor="transparent transparent transparent rgba(255,255,255,0.7)"
            borderWidth="7px 0 7px 12px"
            ml="2px"
          />
        )}
      </Flex>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </Flex>
  );
};

const PdfViewer = ({ src }) => (
  <iframe
    src={src}
    title="PDF viewer"
    style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
  />
);

const TextEditor = ({ text, onChange, filename }) => (
  <Box sx={EDITOR_STYLES}>
    <CodeMirror
      value={text}
      onChange={onChange}
      theme={githubDark}
      extensions={[getLanguageExtension(filename)].filter(Boolean)}
      style={{ minHeight: "300px" }}
    />
  </Box>
);

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
}) => {
  const token = localStorage.getItem("token");
  const [text, setText] = useState("");
  const [objectUrl, setObjectUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [epubData, setEpubData] = useState(null);
  const objectUrlRef = useRef(null);

  const fileType = getFileType(filename);

  const buildUrl = () =>
    serverId
      ? `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`
      : `/api/download/${currentDirectory}/${filename}`;

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
  const buffer = await apiClient.getArrayBuffer(
    buildUrl(),
    { signal },
  );

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
  }, [serverId, currentDirectory, filename, fileType, isNew]);
  
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

  const renderContent = () => {
    switch (fileType) {
      case "video":
        return <VideoPlayer src={streamUrl} />;
      case "audio":
        return <AudioPlayer src={streamUrl} filename={filename} />;
      case "image":
        return <ImageViewer src={objectUrl} alt={filename} />;
      case "pdf":
        return <PdfViewer src={objectUrl} />;
      case "epub":
        return <EpubViewer src={epubData} filename={filename} />;
      default:
        return (
          <TextEditor text={text} onChange={setText} filename={filename} />
        );
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
        showSave={fileType === "text"}
      />
      <Box flex={1} overflow="auto">
        {renderContent()}
      </Box>
    </Box>
  );
};

export default FileEdit;
