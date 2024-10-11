import React, { useState } from "react";
import { Button, Input, Box } from "@chakra-ui/react";
const CreateFolder = ({ onFolderCreated, currentPath, toast }) => {
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

    try {
      const response = await fetch("/api/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ folderName, currentPath }),
      });

      if (response.ok) {
        toast({
          title: "Folder Created",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onFolderCreated();
      } else {
        toast({
          title: "Error creating folder",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error creating folder",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }

    setFolderName("");
  };

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      display="flex"
      gap="2"
      
      maxW="300px"
      mx="auto"
      mb="4"
    >
      <Input
        size="sm"
        type="text"
        placeholder="Folder name"
        value={folderName}
        onChange={handleInputChange}
        flex="1"
      />
      <Button size="sm" type="submit" colorScheme="blue">
        Create
      </Button>
    </Box>
  );
};

export default CreateFolder;
