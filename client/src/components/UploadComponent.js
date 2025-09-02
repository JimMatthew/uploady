import React, { useRef, useState } from "react";
import {
  Progress,
  Button,
  Input,
  Box,
  HStack,
  FormControl,
  useColorModeValue,
  IconButton,
  List,
  ListItem,
  Text,
  VStack
} from "@chakra-ui/react";
import useFileUpload from "../controllers/useFileUpload";
import { CloseIcon } from "@chakra-ui/icons";
import { FiFile } from "react-icons/fi";
function Upload({
  apiEndpoint,
  additionalData = {},
  onUploadSuccess,
  onUploadError,
}) {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const { uploadFiles, progresses } = useFileUpload({
    apiEndpoint,
    token: localStorage.getItem("token"),
    additionalData,
  });

  const handleFileChange = (event) => {
    setFiles((prevFiles) => [...prevFiles, ...Array.from(event.target.files)]);
  };

  const onFinish = () => {
    setFiles([]);
    onUploadSuccess();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await uploadFiles(files, onFinish);
    fileInputRef.current.value = null;
  };

  const handleCancel = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
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
        {files.length > 0 && (
  <List spacing={3} width="100%">
    {files.map((file, index) => (
      <ListItem
        key={index}
        bg="white"
        p={4}
        borderRadius="xl"
        borderWidth="1px"
        boxShadow="md"
        _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
        transition="all 0.2s ease"
      >
        <HStack justify="space-between" align="center" spacing={4}>
          {/* File icon + name + progress */}
          <HStack flex="1" spacing={3} align="flex-start">
            <Box
              bg="blue.50"
              p={2}
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <FiFile size={20} color="#3182ce" />
            </Box>
            <VStack align="start" spacing={1} flex="1">
              <Text fontWeight="semibold" color="blue.700" noOfLines={1}>
                {file.name}
              </Text>
              <Progress
                value={progresses[index]}
                size="sm"
                colorScheme="blue"
                borderRadius="md"
                width="100%"
              />
            </VStack>
          </HStack>

          {/* Cancel button */}
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
)}
      </FormControl>
    </Box>
  );
}

export default Upload;
