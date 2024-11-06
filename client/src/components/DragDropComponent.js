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
  Progress,
} from "@chakra-ui/react";

const DragAndDropComponent = ({
  apiEndpoint,
  additionalData = {},
  onUploadSuccess,
  onUploadError,
}) => {
  const [files, setFiles] = useState([]);
  const [progresses, setProgresses] = useState([]);
  const toast = useToast();
  const bgColor = useColorModeValue("white", "gray.300");
  const bgHover = useColorModeValue("gray.500", "gray.400");
  const token = localStorage.getItem("token");

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
    setProgresses(new Array(acceptedFiles.length).fill(0));
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

    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", apiEndpoint, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded * 100) / event.total);
            setProgresses((prevProgresses) => {
              const newProgresses = [...prevProgresses];
              newProgresses[index] = percentComplete;
              return newProgresses;
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("An error occurred while uploading the file."));
        };

        const formData = new FormData();
        
        for (const key in additionalData) {
          formData.append(key, additionalData[key]);
        }
        formData.append("files", file);
        xhr.send(formData);
      });
    });

    try {
      await Promise.all(uploadPromises);
      toast({
        title: "Files Uploaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onUploadSuccess?.(); // Callback to refresh or perform post-upload actions
      setFiles([]);
      setProgresses([]);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "An error occurred while uploading files",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      onUploadError?.(error);
    }
  };

  return (
    <VStack spacing={4} width="50%">
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
        bg={isDragActive ? bgHover : bgColor}
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
                <Text>{file.name}</Text>
                <Progress
                align="left"
                  value={progresses[index]}
                  size="md"
                  colorScheme="blue"
                  mt={2}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

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

export default DragAndDropComponent;