import React, { useState, useEffect } from "react";
import {
  Box,
  SimpleGrid,
  Text,
  IconButton,
  Stack,
  Heading,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import { FaFolder, FaFile, FaDownload, FaTrash } from "react-icons/fa";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/Upload";
import SftpController from "../controllers/SftpController";
import CreateSftpFolder from "./CreateSftpFolder";
const FileFolderViewer = ({ serverId, toast }) => {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const token = localStorage.getItem("token");
  const {
    deleteSftpFile,
    downloadSftpFile,
    deleteSftpFolder,
    createSftpFolder,
    generateBreadcrumb,
    changeSftpDirectory,
    handleUpload,
  } = SftpController({ toast, setFiles });

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  useEffect(() => {
    if (!connected) {
      const connectToServer = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/sftp/api/connect/${serverId}/`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          const data = await response.json();
          setFiles(data);
          setConnected(true);
        } catch (error) {
          console.error("Failed to connect to the server:", error);
        } finally {
          setLoading(false);
        }
      };

      connectToServer();
    }
  }, [serverId, connected]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      alert("Please select a file first");
      return;
    }
    handleUpload(
      file,
      serverId,
      files.currentDirectory,
      changeSftpDirectory(serverId, files.currentDirectory)
    );
  };
  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" />
        <Text mt={2}>Connecting to the server...</Text>
      </Box>
    );
  }

  if (!files) {
    return <Text>No files found or failed to connect to the server.</Text>;
  }

  return (
    <Box
      p={6}
      borderWidth="1px"
      borderRadius="md"
      boxShadow="md"
      bg="white"
      maxWidth="1200px"
      mx="auto"
    >
      {/* Heading */}
      <Box mb={6}>
        <Upload
          handleFileChange={handleFileChange}
          handleSubmit={handleSubmit}
        />
        <Heading size="lg" mb={4} color="gray.700">
          Files and Folders
        </Heading>
      </Box>

      {/* Folder Creation and Breadcrumb */}
      <HStack justify="space-between" mb={6} align="center">
        <CreateSftpFolder
          sftpCreateFolderOnSubmit={(folder) =>
            createSftpFolder(folder, serverId, files.currentDirectory)
          }
        />
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={(directory) => changeSftpDirectory(serverId, directory)}
          color="gray.500"
        />
      </HStack>

      {/* Folders Section */}
      {files.folders && files.folders.length > 0 && (
        <Box mb={8}>
          <Heading size="md" mb={4} color="gray.600">
            Folders
          </Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          >
            {files.folders.map((folder, index) => (
              <Box
                key={index}
                p={4}
                borderWidth="1px"
                borderRadius="md"
                _hover={{ bg: "gray.50", cursor: "pointer" }}
                transition="background-color 0.2s"
                onClick={() =>
                  changeSftpDirectory(
                    serverId,
                    `${files.currentDirectory}/${folder.name}`
                  )
                }
              >
                <HStack justify="space-between" align="center">
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
                    onClick={() =>
                      deleteSftpFolder(
                        folder.name,
                        serverId,
                        files.currentDirectory
                      )
                    }
                    variant="ghost"
                    colorScheme="red"
                  />
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Files Section */}
      {files.files && files.files.length > 0 && (
        <Box>
          <Heading size="md" mb={4} color="gray.600">
            Files
          </Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(180px, 1fr))"
          >
            {files.files.map((file, index) => (
              <Box
                key={index}
                p={4}
                borderWidth="1px"
                borderRadius="md"
                _hover={{ bg: "gray.50" }}
                transition="background-color 0.2s"
              >
                <Stack>
                  <HStack justify="space-between" align="center">
                    <HStack spacing={2}>
                      <FaFile size={24} />
                      <Text fontWeight="medium" color="gray.700">
                        {file.name}
                      </Text>
                    </HStack>
                    <Text color="gray.500" fontSize="sm">
                      {file.size} KB
                    </Text>
                  </HStack>

                  {/* Action Buttons */}
                  <HStack justify="space-between" mt={4}>
                    <IconButton
                      size="sm"
                      icon={<FaDownload />}
                      aria-label="Download File"
                      onClick={() =>
                        downloadSftpFile(
                          file.name,
                          serverId,
                          files.currentDirectory
                        )
                      }
                      variant="outline"
                      colorScheme="blue"
                    />
                    <IconButton
                      size="sm"
                      icon={<FaTrash />}
                      aria-label="Delete File"
                      onClick={() =>
                        deleteSftpFile(
                          file.name,
                          serverId,
                          files.currentDirectory
                        )
                      }
                      variant="outline"
                      colorScheme="red"
                    />
                  </HStack>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default FileFolderViewer;
