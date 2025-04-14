import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  IconButton,
  Heading,
  HStack,
  useColorModeValue,
  Icon
} from "@chakra-ui/react";
import { FaFolder, FaTrash, FaDownload } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";
const FolderList = ({ folders, changeDirectory, deleteFolder, downloadFolder }) =>{
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
              <Icon as={FcFolder} boxSize={6} />
              <Text fontWeight="medium" >
                {folder.name}
              </Text>
            </HStack>
            <HStack spacing={2}>
            <IconButton
              size="sm"
              icon={<FaDownload />}
              aria-label="download Folder"
              onClick={() => downloadFolder(folder.name)}
              variant="ghost"
              colorScheme="blue"
            />
            <IconButton
              size="sm"
              icon={<FaTrash />}
              aria-label="Delete Folder"
              onClick={(e) => {deleteFolder(folder.name);e.stopPropagation();}}
              variant="ghost"
              colorScheme="red"
            />
            </HStack>
          </HStack>
        ))}
      </Box>
    </Box>
  );
} 

  export default FolderList;