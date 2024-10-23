import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  IconButton,
  Heading,
  HStack,
  useColorModeValue
} from "@chakra-ui/react";
import { FaFolder, FaTrash } from "react-icons/fa";

const FolderList = ({ folders, changeDirectory, deleteFolder }) =>{
  const bgg = useColorModeValue('gray.50', 'gray.600')
  return (
    <Box mb={8}>
      <Heading size="md" mb={4} color="gray.600">
        Folders
      </Heading>
      <Box>
        {folders.map((folder, index) => (
          <HStack
            key={index}
            justify="space-between"
            p={4}
            borderWidth="1px"
            borderRadius="md"
            _hover={{ bg: bgg, cursor: "pointer" }}
            onClick={() => changeDirectory(folder.name)}
          >
            <HStack spacing={2}>
              <FaFolder size={24} />
              <Text fontWeight="medium" >
                {folder.name}
              </Text>
            </HStack>
            <IconButton
              size="sm"
              icon={<FaTrash />}
              aria-label="Delete Folder"
              onClick={() => deleteFolder(folder.name)}
              variant="ghost"
              colorScheme="red"
            />
          </HStack>
        ))}
      </Box>
    </Box>
  );
} 

  export default FolderList;