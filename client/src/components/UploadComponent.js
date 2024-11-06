import React, { useRef, useState } from "react";
import {
  Progress,
  Button,
  Input,
  Box,
  HStack,
  FormControl,
  useColorModeValue,
} from "@chakra-ui/react";
import { useFileUpload } from "../controllers/UsefileUpload";
import useFileUpload2 from "../controllers/useFileUpload2";
function Upload({
  postUrl,
  relativePath,
  serverId,
  currentDirectory,
  refreshCallback,
  toast,
}) {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  
  const token = localStorage.getItem("token");
  const fileInputRef = useRef(null);
  const additionalData =
    serverId && currentDirectory
      ? { currentDirectory, serverId }
      : { folderPath: relativePath };

  const { uploadFiles, progresses } = useFileUpload({
    apiEndpoint,
    token: localStorage.getItem("token"),
    additionalData,
  });
  const { uploadProgress, uploadFile } = useFileUpload({
    postUrl,
    token,
    toast,
  });

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    

    try {
      await uploadFile(file, additionalData);

      refreshCallback();

      setFile(null);
      fileInputRef.current.value = null;
    } catch (error) {
      console.log(error);
    }
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
          <Progress
            align="left"
            mt={4}
            value={uploadProgress}
            size="sm"
            colorScheme="blue"
          />
        )}
      </FormControl>
    </Box>
  );
}

export default Upload;
