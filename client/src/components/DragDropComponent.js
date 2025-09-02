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
  Progress,
  IconButton,
  HStack,
} from "@chakra-ui/react";
import useFileUpload from "../controllers/useFileUpload";
import { CloseIcon } from "@chakra-ui/icons";
const DragAndDropComponent = ({
  apiEndpoint,
  additionalData = {},
  onUploadSuccess,
  onUploadError,
}) => {
  const [files, setFiles] = useState([]);
  const bgColor = useColorModeValue("white", "gray.300");
  const bgHover = useColorModeValue("gray.500", "gray.400");
  const token = localStorage.getItem("token");

  const { uploadFiles, progresses } = useFileUpload({
    apiEndpoint,
    token,
    additionalData,
  });
  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const onFinish = () => {
    setFiles([]);
    onUploadSuccess();
  };

  const handleUpload = () => {
    uploadFiles(files, onFinish);
  };

  const handleCancel = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
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
          <Text color={"blue"} fontWeight="bold" mb={2}>
            Selected Files:
          </Text>
          <List spacing={2}>
            {files.map((file, index) => (
              <ListItem
                key={index}
                bg="gray.300"
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.300"
                boxShadow="sm"
              >
                <HStack justify="space-between" align="center">
                  <Box flex="1">
                    <Text fontWeight="semibold" color={"blue.700"}>{file.name}</Text>
                    <Progress
                      align="left"
                      value={progresses[index]}
                      size="md"
                      colorScheme="blue"
                      mt={2}
                    />
                  </Box>
                  <IconButton
                    aria-label="Cancel upload"
                    icon={<CloseIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleCancel(index)} 
                  />
                </HStack>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Button
        onClick={handleUpload}
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
