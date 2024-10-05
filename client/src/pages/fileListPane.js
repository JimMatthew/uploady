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
const FileDisplay = ({ data, onFolderClick, onRefresh, toast }) => {
  const { files, folders, breadcrumb, currentPath, user, relativePath } = data;
  const token = localStorage.getItem("token");

  const rp = "/" + relativePath;
  const direction = useBreakpointValue({ base: "column", md: "row" });
  const handleShareLink = (fileName) => {
    fetch(`/api/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName, filePath: rp }),
    })
      .then((res) => res.json())
      .then((data) => {
        onRefresh();
        toast({
          title: "Link generated.",
          description: `Share link created for ${fileName}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: `Failed to generate link for ${fileName}`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const handleDownload = (fileName) => {
    fetch(`/api/download/${rp}/${fileName}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Add your token
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => console.error("Download error:", error));
  };
  
  const handleDelete = (fileName) => {
    fetch(`/api/delete/${rp}/${fileName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName: fileName }),
    })
      .then((res) => res.json())
      .then((data) => {
        onRefresh(relativePath);
        toast({
          title: "File Deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const handleDeleteFolder = (folderName) => {
    fetch(`/api/delete-folder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        folderName: folderName,
        folderPath: relativePath,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        onRefresh(relativePath);
        toast({
          title: "File Deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

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
          {folders.map((folder, index) => (
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
                  onClick={() => handleDeleteFolder(folder.name)}
                >
                  Delete
                </Button>
              </HStack>
            </Box>
          ))}

          {/* Files */}
          {files.map((file, index) => (
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
                  <Button size="sm" onClick={() => handleDownload(file.name)}>
                    Download
                  </Button>
                  <Button size="sm" onClick={() => handleShareLink(file.name)}>
                    Share
                  </Button>
                  <Button size="sm" onClick={() => handleDelete(file.name)}>
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

/*

📁
📄
               
*/
