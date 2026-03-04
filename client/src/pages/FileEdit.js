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
  return "text";
};

const getLanguageExtension = (filename) =>
  EXT_LANG[getExt(filename)]?.() ?? javascript();

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

const AudioPlayer = ({ src }) => (
  <Box px={4} py={6}>
    <audio controls style={{ width: "100%" }}>
      <source src={src} type="audio/mpeg" />
    </audio>
  </Box>
);

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
      extensions={[getLanguageExtension(filename)]}
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
    bg="rgba(8,8,12,0.8)"
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
}) => {
  const token = localStorage.getItem("token");
  const [text, setText] = useState("");
  const [objectUrl, setObjectUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const objectUrlRef = useRef(null);

  const fileType = getFileType(filename);

  const buildUrl = () =>
    serverId
      ? `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`
      : `/api/download/${currentDirectory}/${filename}`;

  const streamUrl = `/api/downloadstream/${currentDirectory}/${filename}`;

  // Fetch file and create a typed object URL for binary types
  const fetchAsObjectUrl = async (mimeType) => {
    const res = await fetch(buildUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const typedBlob = new Blob([blob], { type: mimeType });
    const url = URL.createObjectURL(typedBlob);
    objectUrlRef.current = url;
    setObjectUrl(url);
  };

  // Stream text file content progressively into the editor
  const streamTextFile = async () => {
    const decoder = new TextDecoder();
    const res = await fetch(buildUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reader = res.body.getReader();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
      setText(result);
    }
  };

  useEffect(() => {
    // Reset state when file changes
    setText("");
    setObjectUrl(null);

    if (fileType === "image") {
      fetchAsObjectUrl("image/*");
      return;
    }
    if (fileType === "pdf") {
      fetchAsObjectUrl("application/pdf");
      return;
    }
    if (fileType === "text") {
      streamTextFile();
      return;
    }
    // video and audio use direct src URLs — no fetch needed

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [filename]);

  const saveFile = async () => {
    setSaving(true);
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

    try {
      const res = await fetch(remote ? "/sftp/api/upload" : "/api/upload", {
        headers: { Authorization: `Bearer ${token}` },
        method: "POST",
        body: formData,
      });
      toast({
        title: res.ok ? "Saved" : "Save failed",
        status: res.ok ? "success" : "error",
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
        return <AudioPlayer src={streamUrl} />;
      case "image":
        return (
          <Box p={4}>
            <ImageViewer src={objectUrl} alt={filename} />
          </Box>
        );
      case "pdf":
        return <PdfViewer src={objectUrl} />;
      default:
        return (
          <TextEditor text={text} onChange={setText} filename={filename} />
        );
    }
  };

  return (
    <Box h="100%" display="flex" flexDirection="column" bg="#0A0A0E">
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
