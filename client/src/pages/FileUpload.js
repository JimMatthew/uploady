import React, { useState } from "react";
import {
  Button,
  Input,
  Box,
  Text,
  Collapse,
  useDisclosure,
  Card,
  useToast,
  CardHeader,
  CardBody,
  Stack,
  SimpleGrid,
  HStack,
  FormControl,
  useColorModeValue,
} from "@chakra-ui/react";
function FileUpload({ relativePath, refreshPath, toast }) {
  
  const [file, setFile] = useState(null);
  const token = localStorage.getItem("token");
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
    console.log("curp" + currentPath);
    try {
      const response = await fetch("/api/upload", {
        headers: {
          Authorization: `Bearer ${token}`, // Add your token
        },
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "File Uploaded",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        //alert("File uploaded successfully");
        refreshPath(relativePath);
      } else {
        alert("File upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
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
      </FormControl>
    </Box>
  );
}

export default FileUpload;
