import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Button,
  HStack,
  VStack,
  Stack,
  Icon,
  useBreakpointValue,
} from "@chakra-ui/react";
import CreateFolder from "../components/CreateFolder";
import { FcFolder } from "react-icons/fc";
import { FcFile } from "react-icons/fc";
import fileController from "../controllers/fileController";
import Breadcrum from "../components/Breadcrumbs";
const FileDisplay = ({ data, onFolderClick, onRefresh, toast, files, folders, handleBreadcrumbClick }) => {
  const {  currentPath, user, relativePath } = data;
  const token = localStorage.getItem("token");
  const {
    handleFileDownload,
    handleFileDelete,
    handleFileShareLink,
    handleDeleteFolder,
  } = fileController({ toast, onRefresh });
  const rp = "/" + relativePath;
  const direction = useBreakpointValue({ base: "column", md: "row" });

  const generateBreadcrumb = (path) => {
    const breadcrumbs = [];
    let currentPath = `files`;
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentPath,
      });
    });
    breadcrumbs.unshift({ name: "Home", path: `files` });
    return breadcrumbs;
  };
  return (
    <Box mt={6} p={6} borderWidth="1px" borderRadius="lg" boxShadow="lg" bg="white" maxWidth="1200px" mx="auto">
    {/* Header with Breadcrumb and Folder Creation */}
    <Stack
      direction={{ base: "column", md: "row" }} 
      justify="space-between" 
      align={{ base: "start", md: "center" }} 
      spacing={4}
      mb={6} 
    >
      <Breadcrum
        breadcrumb={generateBreadcrumb(rp)}
        onClick={(path) => handleBreadcrumbClick(path)}
        color="gray.600"
      />
      <CreateFolder
        onFolderCreated={onRefresh}
        currentPath={relativePath}
        toast={toast}
      />
    </Stack>
  
    {/* List of Folders and Files */}
    <VStack spacing={6} align="stretch">
      {/* Folders */}
      {folders && folders.length > 0 && folders.map((folder, index) => (
        <Box
          key={index}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          _hover={{ shadow: "xl", bg: "gray.50", cursor: "pointer" }}
          transition="all 0.2s"
          onClick={() => onFolderClick(folder.name)}
        >
          <HStack justify="space-between" align="center">
            <HStack>
              <Icon as={FcFolder} boxSize={6} />
              <Text fontWeight="semibold" fontSize="lg" isTruncated>
                {folder.name}
              </Text>
            </HStack>
            <HStack spacing={4}>
              <Text fontSize="sm" color="gray.500">
                Folder
              </Text>
              <Button
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent clicking folder
                  handleDeleteFolder(folder.name, rp);
                }}
              >
                Delete
              </Button>
            </HStack>
          </HStack>
        </Box>
      ))}
  
      {/* Files */}
      {files && files.length > 0 && files.map((file, index) => (
        <Box
          key={index}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          _hover={{ shadow: "xl", bg: "gray.50",cursor: "pointer" }}
          transition="all 0.2s"
        >
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FcFile} boxSize={6} />
                <Text fontWeight="semibold" fontSize="lg" isTruncated>
                  {file.name}
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {file.size} KB | {file.date}
              </Text>
            </VStack>
  
            <Stack direction={{ base: "column", md: "row" }} spacing={2}>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => handleFileDownload(file.name, rp)}
              >
                Download
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => handleFileShareLink(file.name, rp)}
              >
                Share
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="ghost"
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
  );
};

export default FileDisplay;
