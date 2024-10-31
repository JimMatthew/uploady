import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { Button, useColorModeValue } from "@chakra-ui/react";
import { githubDark } from "@uiw/codemirror-theme-github";
import { githubLight } from "@uiw/codemirror-theme-github";
import { materialDark }from "@uiw/codemirror-theme-material";
const FileEdit = ({ serverId, currentDirectory, filename, toast }) => {
  const token = localStorage.getItem("token");
  const [text, setText] = useState("");
  const cm = useColorModeValue(githubLight, materialDark);
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
    setText(content)
  }
  
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
      <CodeMirror value={text} onChange={updateContent} theme={cm}/>
    </div>
  );
};

export default FileEdit;
