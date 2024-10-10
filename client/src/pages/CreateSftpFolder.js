import React, { useState } from "react";
import { Button, Input, Box, HStack } from "@chakra-ui/react";
const CreateSftpFolder = ({
     sftpCreateFolderOnSubmit,
}) => {
  const [folderName, setFolderName] = useState("");
  
  const handleInputChange = (e) => {
    setFolderName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (folderName.trim() === "") {
      alert("Please enter a valid folder name");
      return;
    }

    sftpCreateFolderOnSubmit(folderName)
    setFolderName('')
  };

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      p={4}
      boxShadow="md"
      borderRadius="md"
      bg="gray.50"
      maxW="400px"
      mx="auto"
      mt={6}
    >
      <HStack spacing={4}>
        <Input
          size="sm"
          variant="filled"
          placeholder="Enter folder name"
          value={folderName}
          onChange={handleInputChange}
          focusBorderColor="blue.400"
          borderRadius="md"
          bg="white"
        />
        <Button
          size="sm"
          type="submit"
          colorScheme="blue"
          borderRadius="md"
          px={6}
        >
          Create
        </Button>
      </HStack>
    </Box>
  );
};

export default CreateSftpFolder;