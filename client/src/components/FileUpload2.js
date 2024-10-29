import React, { useState,useRef } from "react";
import Upload from "./Upload";
import { Progress, Button,
  Input,
  Box,
  HStack,
  FormControl,
  useColorModeValue,
   } from "@chakra-ui/react"; // Assuming you're using Chakra UI

function FileUpload({ relativePath, refreshPath, toast }) {
  const [file, setFile] = useState(null);
  //const [progress, setProgress] = useState(0); // Track the upload progress
  const token = localStorage.getItem("token");
  const [uploadProgress, setProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const currentPath = "/";
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("folderPath", relativePath);
    formData.append("files", file);

    // Create a new XMLHttpRequest for file upload with progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // Update progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setProgress(percentComplete); // Update progress bar
      }
    };

    // Handle response
    xhr.onload = () => {
      if (xhr.status === 200) {
        toast({
          title: "File Uploaded",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        refreshPath(relativePath);
        setProgress(0); // Reset progress
      } else {
        alert("File upload failed");
      }
    };

    // Handle error
    xhr.onerror = () => {
      alert("An error occurred while uploading the file.");
    };

    // Send the form data
    xhr.send(formData);
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
          <Progress align="left" mt={4} value={uploadProgress} size="sm" colorScheme="blue" />
        )}
      </FormControl>
    </Box>
  );
}

export default FileUpload;