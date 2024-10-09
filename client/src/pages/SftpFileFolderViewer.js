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
import Breadcrumbs from "./Breadcrumbs";
import Upload from "./Upload";
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
    <Box p={4}>
      {/* Heading */}
      <Upload handleFileChange={handleFileChange} handleSubmit={handleSubmit} />

      <Heading size="md" mb={6}>
        Files and Folders
      </Heading>
      <Box>
        <CreateSftpFolder
          sftpCreateFolderOnSubmit={(folder) =>
            createSftpFolder(
              folder,
              serverId,
              files.currentDirectory,
            )
          }
        />
      </Box>
      <Text>
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={(directory) =>
            changeSftpDirectory(serverId, directory)
          }
        />
      </Text>
      {/* Folders */}
      {files.folders && files.folders.length > 0 && (
        <Box mb={6}>
          <Heading size="sm" mb={4}>
            Folders
          </Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          >
            {files.folders.map((folder, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                _hover={{ bg: "gray.100", cursor: "pointer" }}
                onClick={() =>
                  changeSftpDirectory(
                    serverId,
                    files.currentDirectory + "/" + folder.name,
                  )
                }
              >
                <HStack justify="space-between">
                  <FaFolder size={24} />
                  <Text fontWeight="bold">{folder.name}</Text>
                  <IconButton
                    size="sm"
                    aria-label="Delete File"
                    icon={<FaTrash />}
                    onClick={() =>
                      deleteSftpFolder(
                        folder.name,
                        serverId,
                        files.currentDirectory,
                      )
                    }
                  />
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Files */}
      {files.files && files.files.length > 0 && (
        <Box>
          <Heading size="sm" mb={4}>
            Files
          </Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(180px, 1fr))"
          >
            {files.files.map((file, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                _hover={{ bg: "gray.100" }}
              >
                <Stack>
                  <HStack>
                    <FaFile size={24} />
                    <Text fontWeight="bold">{file.name}</Text>
                  </HStack>
                  <Text color="gray.500">{file.size} KB</Text>

                  {/* Action buttons */}
                  <HStack justify="space-between">
                    <IconButton
                      size="sm"
                      aria-label="Download File"
                      icon={<FaDownload />}
                      onClick={() =>
                        downloadSftpFile(
                          file.name,
                          serverId,
                          files.currentDirectory
                        )
                      }
                    />

                    <IconButton
                      size="sm"
                      aria-label="Delete File"
                      icon={<FaTrash />}
                      onClick={() =>
                        deleteSftpFile(
                          file.name,
                          serverId,
                          files.currentDirectory,
                        )
                      }
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
