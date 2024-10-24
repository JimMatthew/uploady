import React, { useState, useRef } from "react";
import {
  Button,
  Input,
  Box,
  HStack,
  FormControl,
  useColorModeValue,
  Progress
} from "@chakra-ui/react";

function Upload({ changeSftpDirectory, toast, serverId, currentDirectory }) {
  const token = localStorage.getItem("token");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const formData = new FormData();
    formData.append("currentDirectory", currentDirectory);
    formData.append("serverId", serverId);
    formData.append("files", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        setUploadProgress(percentCompleted); 
      }
    });

    xhr.open("POST", "/sftp/api/upload", true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = function () {
      if (xhr.status === 200) {
        changeSftpDirectory(serverId, currentDirectory); // Refresh directory on successful upload
        setUploadProgress(0);
        fileInputRef.current.value = null;
      } else {
        toast({
          title: "File Upload Failed",
          description: "There was an error uploading the file",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    xhr.onerror = function () {
      console.error("Error uploading file");
    };

    xhr.send(formData);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };
 
  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      p={4}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      background={useColorModeValue("gray.50", "gray.800")}
      maxW="lg"
      mx="auto"
    >
      <FormControl>
        <HStack spacing={4} align="center">
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            variant="unstyled"
            _focus={{ outline: "none" }}
            p={2}
            bg={useColorModeValue("white", "gray.700")}
            borderWidth="1px"
            borderRadius="md"
            size="md"
          />
          <Button
            colorScheme="blue"
            type="submit"
            size="md"
            px={6}
            _hover={{ bg: "blue.600" }}
          >
            Upload
          </Button>
        </HStack>
        {uploadProgress > 0 && (
          <Progress mt={4} value={uploadProgress} size="sm" colorScheme="blue" />
        )}
      </FormControl>
    </Box>
  );
}

export default Upload;