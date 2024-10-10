import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Stack,
  Icon,
  useBreakpointValue,
} from "@chakra-ui/react";
import CreateFolder from "./CreateFolder";
import { FcFolder } from "react-icons/fc";
import { FcFile } from "react-icons/fc";
import fileController from "../controllers/fileController";
const FileDisplay = ({ data, onFolderClick, onRefresh, toast }) => {
  const { files, folders, currentPath, user, relativePath } = data;
  const token = localStorage.getItem("token");
  const {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
  } = fileController({ toast, onRefresh });
  const rp = "/" + relativePath;
  const direction = useBreakpointValue({ base: "column", md: "row" });

  return (
    <Box>
      <Box mt={4} borderWidth="1px" borderRadius="lg" p={4}>
        <Heading as="h2" size="md" mb={4}>
          <HStack justify={"space-between"}>
            <Text>Contents of {currentPath}</Text>
            <Box>
              <CreateFolder
                onFolderCreated={onRefresh}
                currentPath={relativePath}
                toast={toast}
              />
            </Box>
          </HStack>
        </Heading>

        {/* Stack for Folder and File Cards */}
        <VStack spacing={4}>
          {/* Folders */}
          {folders &&
            folders.map((folder, index) => (
              <Box
                key={index}
                w="100%"
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                _hover={{ shadow: "md", cursor: "pointer" }}
                onClick={() => onFolderClick(folder.name)}
              >
                <HStack align="center" justify="space-between">
                  <HStack>
                    <Icon as={FcFolder} boxSize={6} color="blue.500" />
                    <Text fontWeight="bold" isTruncated>
                      {folder.name}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    Folder
                  </Text>
                  <Button
                    size="sm"
                    onClick={() => handleDeleteFolder(folder.name, rp)}
                  >
                    Delete
                  </Button>
                </HStack>
              </Box>
            ))}

          {/* Files */}
          {files &&
            files.map((file, index) => (
              <Box
                key={index}
                w="100%"
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                _hover={{ shadow: "md" }}
              >
                <HStack align="center" justify="space-between">
                  <VStack align="start">
                    <HStack>
                      <Icon as={FcFile} boxSize={6} color="green.500" />
                      <Text fontWeight="bold" isTruncated>
                        {file.name}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.500">
                      {file.size} KB | {file.date}
                    </Text>
                  </VStack>

                  {/* Action Buttons */}
                  <Stack direction={direction} spacing={2}>
                    <Button
                      size="sm"
                      onClick={() => handleFileDownload(file.name, rp)}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleFileShareLink(file.name, rp)}
                    >
                      Share
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleFileDelete(file.name, rp)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </HStack>
              </Box>
            ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default FileDisplay;
