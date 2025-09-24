import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  Box,
  Flex,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  Spacer,
  useColorModeValue,
} from "@chakra-ui/react";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { cpp } from "@codemirror/lang-cpp";
import ImageViewer from "../components/ImageViewer";

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isImageFile(fileName) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
}

function getLanguageExtension(fileType) {
  switch (fileType) {
    case "js":
      return javascript({ jsx: true });
    case "java":
      return java();
    case "json":
      return json();
    case "rs":
      return rust();
    case "html":
      return html();
    case "cpp":
    case "c":
      return cpp();
    default:
      return javascript();
  }
}

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
  const [fileType, setFileType] = useState("text"); // "image" | "pdf" | "text"
  const theme = useColorModeValue(githubLight, githubDark);
  const [objectUrl, setObjectUrl] = useState(null);
  const buildUrl = () =>
    serverId
      ? `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`
      : `/api/download/${currentDirectory}/${filename}`;

  useEffect(() => {
    async function fetchFile() {
      const ext = getFileExtension(filename);

      if (isImageFile(filename)) {
        setFileType("image");
        try {
          const response = await fetch(buildUrl(), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to fetch image");
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setObjectUrl(url);
        } catch (err) {
          console.error(err);
        }
        return;
      }

      if (ext === "pdf") {
        setFileType("pdf");
        try {
          const response = await fetch(buildUrl(), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to fetch PDF");
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setObjectUrl(url);
        } catch (err) {
          console.error(err);
        }
        return;
      }

      // default: text
      setFileType("text");
      const decoder = new TextDecoder();
      const response = await fetch(buildUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const reader = response.body.getReader();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
        setText(result);
      }
    }

    fetchFile();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);

  const saveFile = async () => {
    const formData = new FormData();
    if (remote) {
      formData.append("currentDirectory", currentDirectory);
      formData.append("serverId", serverId);
    } else {
      formData.append("folderPath", currentDirectory);
    }

    const fileBlob = new Blob([text], { type: "text/plain" });
    formData.append("files", fileBlob, filename);

    try {
      const response = await fetch(
        remote ? "/sftp/api/upload" : "/api/upload",
        {
          headers: { Authorization: `Bearer ${token}` },
          method: "POST",
          body: formData,
        }
      );

      toast({
        title: response.ok ? "File Saved" : "Error Saving File",
        status: response.ok ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const renderContent = () => {
    if (fileType === "image") {
      return <ImageViewer src={objectUrl} alt={filename} />;
    }
    if (fileType === "pdf") {
      return (
        <Box>
          <iframe
            src={objectUrl}
            title="file"
            style={{ width: "100%", height: "100vh", border: "none" }}
          />
        </Box>
      );
    }
    return (
      <Box
        border="1px solid"
        borderColor="gray.600"
        borderRadius="md"
        overflow="hidden"
      >
        <CodeMirror
          value={text}
          onChange={setText}
          theme={theme}
          extensions={[getLanguageExtension(getFileExtension(filename))]}
        />
      </Box>
    );
  };

  return (
    <Card
      variant="outline"
      borderRadius="xl"
      boxShadow="md"
      p={4}
      bg={useColorModeValue("gray.50", "gray.800")}
    >
      <CardHeader p={0} mb={3}>
        <Flex align="center">
          <Box>
            <Text fontSize="sm" color="gray.400">
              Host
            </Text>
            <Text fontWeight="semibold">{remote ? host : "Local"}</Text>

            <Text fontSize="sm" color="gray.400" mt={1}>
              File
            </Text>
            <Text fontWeight="semibold">{currentDirectory + filename}</Text>
          </Box>
          <Spacer />
          {fileType === "text" && (
            <Button
              onClick={saveFile}
              colorScheme="blue"
              size="sm"
              _hover={{ bg: "blue.500" }}
              _active={{ bg: "blue.600" }}
            >
              Save
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardBody p={0}>{renderContent()}</CardBody>
    </Card>
  );
};

export default FileEdit;
