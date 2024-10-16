import React, { useState, useEffect } from "react";
import { Box, Text, Stack, Heading, Spinner } from "@chakra-ui/react";
import Breadcrumbs from "../components/Breadcrumbs";
import Upload from "../components/Upload";
import SftpController from "../controllers/SftpController";
import CreateSftpFolder from "../components/CreateSftpFolder";
import FolderListSftp from "../components/FolderListSftp";
import FileListSftp from "../components/FileListSftp";
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

  const handleDownload = (filename) => {
    downloadSftpFile(filename, serverId, files.currentDirectory);
  };

  const handleDelete = (filename) => {
    deleteSftpFile(filename, serverId, files.currentDirectory);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
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
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "start", md: "center" }}
        spacing={4}
        mb={6}
      >
        <Breadcrumbs
          breadcrumb={generateBreadcrumb(files.currentDirectory || "/")}
          onClick={(directory) => changeSftpDirectory(serverId, directory)}
          color="gray.500"
        />
        <CreateSftpFolder
          sftpCreateFolderOnSubmit={(folder) =>
            createSftpFolder(folder, serverId, files.currentDirectory)
          }
        />
      </Stack>

      <FolderListSftp
        folders={files.folders}
        changeDirectory={(folder) =>
          changeSftpDirectory(serverId, `${files.currentDirectory}/${folder}`)
        }
        deleteFolder={deleteSftpFolder}
      />

      <FileListSftp
        files={files.files}
        downloadFile={handleDownload}
        deleteFile={handleDelete}
      />
    </Box>
  );
};

export default FileFolderViewer;
