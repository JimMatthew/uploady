import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Button,
  VStack,
  useBreakpointValue,
  Stack,
  CardBody,
  Card,
  Text,
  Heading,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import SftpFileFolderView from "./SftpFileFolderViewer";
const SFTPApp = () => {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesloading, setfilesLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [relativePath, setRelativePath] = useState("/");
  const handleServerClick = (serverId) => {
    const server = sftpServers.servers.find((s) => s._id === serverId);
    setSelectedServer(server);

    if (!isDesktop) {
      setShowSidebar(false);
    }
  };
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  useEffect(() => {
    if (token) {
      fetchFiles();
    } else {
      console.error("No token found");
    }
  }, [token]);

  const handleDelete = (id) => {
    console.log("Deleting server:", id);
  };

  const handleConnect = async (serverId) => {
    try {
      handleServerClick(serverId);
      setfilesLoading(true);
      const response = await fetch(`/sftp/api/connect/${serverId}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      setSelectedServer(serverId);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error(error);
    } finally {
      setfilesLoading(false);
    }
  };

  const handleListDirectory = async (directory) => {
    try {
      setfilesLoading(true);
      const curPath = files ? files.currentDirectory : "";
      const response = await fetch(
        `/sftp/api/connect/${selectedServer}//${curPath}/${directory}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error(error);
    } finally {
      setfilesLoading(false);
    }
  };

  const changeDirectory = async (directory) => {
    try {
      setfilesLoading(true);
      const response = await fetch(
        `/sftp/api/connect/${selectedServer}//${directory}/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error(error);
    } finally {
      setfilesLoading(false);
    }
  };

  const downloadFile = (filename) => {
    const curPath = files ? files.currentDirectory : "";
    fetch(`/sftp/api/download/${selectedServer}/${curPath}/${filename}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Add your token
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((error) => console.error("Download error:", error));
  };

  const fetchFiles = () => {
    setLoading(true);
    fetch("/sftp/api/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setSftpServers(data))
      .then(setLoading(false))
      .catch((err) => console.error("Error fetching files:", err));
  };
  if (loading || !sftpServers) return <div>Loading...</div>;

  return (
    <Flex minHeight="90vh">
      {/* Sidebar (SFTP Server List) */}
      {isDesktop || showSidebar ? (
        <Box
          width={{ base: "100%", lg: "300px" }}
          bg="gray.100"
          p={4}
          borderRight="1px solid"
          borderColor="gray.300"
          minHeight="100vh"
          position={{ base: "absolute", lg: "relative" }}
          zIndex={1}
        >
          <VStack spacing={4}>
            <Link to="/app/files">
              <button>Go to files</button>
            </Link>
            {sftpServers.servers.map((server) => (
              <Card>
                <CardBody>
                  <Stack spacing={2}>
                    <Text>
                      <strong>Host:</strong> {server.host}
                    </Text>
                    <Text>
                      <strong>Status:</strong> {server.status}
                    </Text>
                    <Stack direction="row" spacing={2} justify="space-between">
                      <Button
                        colorScheme="green"
                        onClick={() => handleConnect(server._id)}
                      >
                        Connect
                      </Button>
                      <Button
                        colorScheme="red"
                        onClick={() => handleDelete(server.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </VStack>
          {!isDesktop && (
            <Button
              mt={4}
              colorScheme="red"
              onClick={() => setShowSidebar(false)}
              width="100%"
            >
              Close Sidebar
            </Button>
          )}
        </Box>
      ) : (
        <Button
          colorScheme="blue"
          onClick={() => setShowSidebar(true)}
          top="10px"
          left="10px"
        >
          Show 
        </Button>
      )}

      {/* Main Panel (File Viewer) */}
      <Box
        flex={1}
        p={4}
        ml={{ base: 0, lg: "20px" }} // Adjust margin on desktop to make room for the sidebar
      >
        {files && selectedServer ? (
          <Box>
            {/* You can add your file viewer component here */}
            <Heading size="lg">Connected to: {files.host}</Heading>
            <SftpFileFolderView
              files={files.files}
              folders={files.folders}
              onFolderClick={(folderName) => handleListDirectory(folderName)}
              onDownload={(filename) => downloadFile(filename)}
              currentDirectory={files.currentDirectory}
              changeDir={(dir) => changeDirectory(dir)}
              serverId={selectedServer}
            />
          </Box>
        ) : (
          <Text>Select a server to connect to.</Text>
        )}
      </Box>
    </Flex>
  );
};

export default SFTPApp;
