import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Button,
  List,
  ListItem,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";

const DragAndDropUpload = ({ relativePath, refreshPath }) => {
  const [files, setFiles] = useState([]);
  const token = localStorage.getItem("token");
  const toast = useToast(); 
  const bgg = useColorModeValue('white', 'gray.300')
  const bggover = useColorModeValue('grey.500', 'grey.400' )
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please drop or select files to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const formData = new FormData();
    formData.append("folderPath", relativePath);
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/upload", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Files Uploaded",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        refreshPath(); // Refresh folder content
        setFiles([])
      } else {
        toast({
          title: "Upload Failed",
          description: "Failed to upload files. Try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "An error occurred while uploading files",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={4} width="50%">
      {/* Dropzone area */}
      <Box
        {...getRootProps()}
        border="2px dashed"
        borderColor={isDragActive ? "blue.500" : "gray.300"}
        padding="40px"
        borderRadius="md"
        width="100%"
        textAlign="center"
        cursor="pointer"
        transition="border-color 0.2s"
        _hover={{ borderColor: "blue.300" }}
        bg={isDragActive ? bggover : bgg}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Text color="blue.500" fontWeight="bold">
            Drop the files here...
          </Text>
        ) : (
          <Text color="gray.600">
            Drag 'n' drop some files here, or click to select files
          </Text>
        )}
      </Box>

      {/* Display selected files */}
      {files.length > 0 && (
        <Box width="100%">
          <Text fontWeight="bold" mb={2}>
            Selected Files:
          </Text>
          <List spacing={2}>
            {files.map((file, index) => (
              <ListItem
                key={index}
                bg="gray.100"
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.300"
              >
                {file.name}
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Upload button */}
      <Button
        onClick={handleSubmit}
        colorScheme="blue"
        isDisabled={files.length === 0}
        width="100%"
      >
        Upload Files
      </Button>
    </VStack>
  );
};

export default DragAndDropUpload;
