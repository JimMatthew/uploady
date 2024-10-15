import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  IconButton,
  Heading,
  HStack,
} from "@chakra-ui/react";
import { FaFolder, FaTrash } from "react-icons/fa";

const FolderList = ({ folders, changeDirectory, deleteFolder }) => (
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
            _hover={{ bg: "gray.50", cursor: "pointer" }}
            onClick={() => changeDirectory(folder.name)}
          >
            <HStack spacing={2}>
              <FaFolder size={24} />
              <Text fontWeight="medium" color="gray.700">
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

  export default FolderList;