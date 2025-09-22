import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
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
import { githubDark } from "@uiw/codemirror-theme-github";
import { githubLight } from "@uiw/codemirror-theme-github";
import { materialDark } from "@uiw/codemirror-theme-material";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import { cpp } from "@codemirror/lang-cpp";
import { transform } from "framer-motion";

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
  const cm = useColorModeValue(githubLight, githubDark);
  useEffect(() => {
    async function fetchFile() {
      const decoder = new TextDecoder();
      const response = remote
        ? await fetch(
            `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        : await fetch(`/api/download/${currentDirectory}/${filename}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
  }, []);

  function getFileExtension(filename) {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
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
        return javascript(); // Default to JavaScript
    }
  }

  function getExtension(filename) {
    return getLanguageExtension(getFileExtension(filename));
  }

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
      const response = remote
        ? await fetch("/sftp/api/upload", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            method: "POST",
            body: formData,
          })
        : await fetch("/api/upload", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            method: "POST",
            body: formData,
          });
      if (response.ok) {
        toast({
          title: "File Saved",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error Saving File",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const updateContent = (content) => {
    setText(content);
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
            {remote ? (
              <Text fontWeight="semibold">{host}</Text>
            ) : (
              <Text fontWeight="semibold"> Local </Text>
            )}

            <Text fontSize="sm" color="gray.400" mt={1}>
              File
            </Text>
            <Text fontWeight="semibold">{currentDirectory + filename}</Text>
          </Box>
          <Spacer />
          <Button
            onClick={saveFile}
            colorScheme="blue"
            size="sm"
            _hover={{ bg: "blue.500" }}
            _active={{ bg: "blue.600" }}
          >
            Save
          </Button>
        </Flex>
      </CardHeader>

      <CardBody p={0}>
        <Box
          border="1px solid"
          borderColor="gray.600"
          borderRadius="md"
          overflow="hidden"
        >
          <CodeMirror
            value={text}
            onChange={updateContent}
            theme={cm}
            extensions={getExtension(filename)}
          />
        </Box>
      </CardBody>
    </Card>
  );
};

export default FileEdit;
