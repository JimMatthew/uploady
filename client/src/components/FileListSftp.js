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
import { FaEdit, FaFolder, FaFile, FaDownload, FaTrash } from "react-icons/fa";
import { FcFile } from "react-icons/fc";
const FileList = ({ files, downloadFile, deleteFile, openFile }) => {
  const bgg = useColorModeValue("gray.50", "gray.600");

  return (
    <Box>
      <Heading size="md" mb={4} color="gray.600">
        Files
      </Heading>
      <Box>
        {files.map((file, index) => (
          <HStack
            key={index}
            justify="space-between"
            p={4}
            borderWidth="1px"
            borderRadius="md"
            _hover={{ bg: bgg }}
            transition="background-color 0.2s"
          >
            <HStack spacing={2}>
            <Icon as={FcFile} boxSize={6} />
              <Text fontWeight="medium">{file.name}</Text>
            </HStack>
            <Text color="gray.500" fontSize="sm">
              {file.size} KB
            </Text>
            <HStack spacing={2}>
              <IconButton
                size="sm"
                icon={<FaEdit />}
                aria-label="Download File"
                onClick={() => openFile(file.name)}
                variant="outline"
                colorScheme="blue"
              />
              <IconButton
                size="sm"
                icon={<FaDownload />}
                aria-label="Download File"
                onClick={() => downloadFile(file.name)}
                variant="outline"
                colorScheme="blue"
              />
              <IconButton
                size="sm"
                icon={<FaTrash />}
                aria-label="Delete File"
                onClick={() => deleteFile(file.name)}
                variant="outline"
                colorScheme="red"
              />
            </HStack>
          </HStack>
        ))}
      </Box>
    </Box>
  );
};

export default FileList;
