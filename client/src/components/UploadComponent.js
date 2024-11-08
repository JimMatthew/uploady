import React, { useRef, useState } from "react";
import {
  Progress,
  Button,
  Input,
  Box,
  HStack,
  FormControl,
  useColorModeValue,
  List,
  ListItem,
  Text,
} from "@chakra-ui/react";
import useFileUpload from "../controllers/useFileUpload";
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
    setFiles(Array.from(event.target.files));
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
          <List spacing={2} width="100%">
            {files.map((file, index) => (
              <ListItem
                key={index}
                bg="gray.100"
                p={2}
                borderRadius="md"
                borderWidth="1px"
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
        )}
      </FormControl>
    </Box>
  );
}

export default Upload;
