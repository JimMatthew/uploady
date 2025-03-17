import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { Button, useColorModeValue } from "@chakra-ui/react";
import { githubDark } from "@uiw/codemirror-theme-github";
import { githubLight } from "@uiw/codemirror-theme-github";
import { materialDark } from "@uiw/codemirror-theme-material";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { html } from "@codemirror/lang-html";
import {cpp} from "@codemirror/lang-cpp"
//import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
//import { languages } from '@codemirror/language-data';
const FileEdit = ({ serverId, currentDirectory, filename, toast }) => {
  const token = localStorage.getItem("token");
  const [text, setText] = useState("");
  const cm = useColorModeValue(githubLight, githubDark);
  useEffect(() => {
    async function fetchFile() {
      const decoder = new TextDecoder();
      const response = await fetch(
        `/sftp/api/download/${serverId}/${currentDirectory}/${filename}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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
    formData.append("currentDirectory", currentDirectory);

    formData.append("serverId", serverId);
    const fileBlob = new Blob([text], { type: "text/plain" });
    formData.append("files", fileBlob, filename);

    try {
      const response = await fetch("/sftp/api/upload", {
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
    <div>
      <Button
        onClick={saveFile}
        colorScheme="blue"
        size="md"
        mt={4}
        _hover={{ bg: "green.500" }}
        _active={{ bg: "green.600" }}
      >
        Save
      </Button>
      <CodeMirror
        value={text}
        onChange={updateContent}
        theme={cm}
        extensions={getExtension(filename)}
      />
    </div>
  );
};

export default FileEdit;
