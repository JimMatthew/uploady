import React, { useState, useEffect } from "react";
import {
  Box,
  SimpleGrid,
  Text,
  IconButton,
  Stack,
  Heading,
  HStack,
  Input,
  Button,
} from "@chakra-ui/react";
import {
  FaFolder,
  FaFile,
  FaDownload,
  FaTrash,
  FaShareAlt,
} from "react-icons/fa";
import Breadcrumbs from "./Breadcrumbs";
import Upload from "./Upload";
import SftpController from "../controllers/SftpController";
import CreateSftpFolder from "./CreateSftpFolder";
const FileFolderViewer = ({
  files,
  folders,
  onShare,
  onFolderClick,
  currentDirectory,
  changeDir,
  serverId,
  toast,
}) => {
  const [file, setFile] = useState(null);
  const [folderName, setFolderName] = useState("");
  const token = localStorage.getItem("token");
  const {
    deleteSftpFile,
    downloadSftpFile,
    deleteSftpFolder,
    createSftpFolder,
  } = SftpController({ toast });
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const generateBreadcrumbs = (path) => {
    const breadcrumbs = [];
    let currentPath = ``;
    const pathParts = path.split("/").filter(Boolean);
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentPath,
      });
    });
    breadcrumbs.unshift({ name: "Home", path: `/` });
    return breadcrumbs;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("currentDirectory", currentDirectory);
    formData.append("files", file);
    formData.append("serverId", serverId);

    try {
      const response = await fetch("/sftp/api/upload", {
        headers: {
          Authorization: `Bearer ${token}`, // Add your token
        },
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        changeDir(currentDirectory);
      } else {
        alert("File upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <Box p={4}>
      {/* Heading */}
      <Upload handleFileChange={handleFileChange} handleSubmit={handleSubmit} />

      <Heading size="md" mb={6}>
        Files and Folders
      </Heading>
      <Box>
        <CreateSftpFolder
          onFolderCreated={changeDir}
          serverId={serverId}
          currentDirectory={currentDirectory}
          toast={toast}
          sftpCreateFolderOnSubmit={(folder) => createSftpFolder(folder, serverId, currentDirectory, changeDir)}
        />
      </Box>
      <Text>
        <Breadcrumbs
          breadcrumb={generateBreadcrumbs(currentDirectory || "/")}
          onClick={changeDir}
        />
      </Text>
      {/* Folders */}
      {folders && folders.length > 0 && (
        <Box mb={6}>
          <Heading size="sm" mb={4}>
            Folders
          </Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(150px, 1fr))"
          >
            {folders.map((folder, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                _hover={{ bg: "gray.100", cursor: "pointer" }}
                onClick={() => onFolderClick(folder.name)}
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
                        currentDirectory,
                        changeDir
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
      {files && files.length > 0 && (
        <Box>
          <Heading size="sm" mb={4}>
            Files
          </Heading>
          <SimpleGrid
            spacing={4}
            templateColumns="repeat(auto-fill, minmax(180px, 1fr))"
          >
            {files.map((file, index) => (
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
                        downloadSftpFile(file.name, serverId, currentDirectory)
                      }
                    />
                    <IconButton
                      size="sm"
                      aria-label="Share File"
                      icon={<FaShareAlt />}
                      onClick={() => onShare(file.name)}
                    />
                    <IconButton
                      size="sm"
                      aria-label="Delete File"
                      icon={<FaTrash />}
                      onClick={() =>
                        deleteSftpFile(
                          file.name,
                          serverId,
                          currentDirectory,
                          changeDir
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
