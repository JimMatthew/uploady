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
import SshConsole from "./SshConsole";
const SFTPApp = () => {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesloading, setfilesLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [view, setView] = useState("files");
  const handleServerClick = (serverId) => {
    const server = sftpServers.servers.find((s) => s._id === serverId);
    setSelectedServer(server);

    if (!isDesktop) {
      setShowSidebar(false);
    }
  };

  const handleSshLaunch = (serverId) => {
    setSelectedServer(serverId);
    setView("ssh");
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

  const getAllServerStats = () => {};

  const pingServer = async (serverId) => {
    const response = fetch(`/sftp/server-status/${serverId}`).then((response) =>
      response.json()
    );
    return response;
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
      setView("files");
    } catch (error) {
      console.error(error);
    } finally {
      setfilesLoading(false);
    }
  };

  const deleteFile = async (filename) => {
    const cd = files.currentDirectory ? files.currentDirectory : "/";
    const response = await fetch("/sftp/api/delete-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },

      body: JSON.stringify({
        currentDirectory: cd,
        serverId: selectedServer,
        fileName: filename,
      }),
    });
    if (!response.ok) {
      //error here
    }
    changeDirectory(files.currentDirectory);
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
    <Flex minHeight="50vh" direction="column">
      {/* "Show" button (for mobile) */}
      {!isDesktop && !showSidebar && (
        <Box width="100%" mb={2} textAlign="center">
          <Button colorScheme="blue" onClick={() => setShowSidebar(true)}>
            Show Servers
          </Button>
        </Box>
      )}

      {/* Flex Container for Sidebar and Main Panel */}
      <Flex flex={1}>
        {/* Sidebar (SFTP Server List) */}
        {isDesktop || showSidebar ? (
          <Box
            width={{ base: "100%", lg: "300px" }}
            bg="gray.100"
            p={4}
            borderRight={{ base: "none", lg: "1px solid" }}
            borderColor="gray.300"
            minHeight={{ base: "100vh", lg: "auto" }}
            position={{ base: "absolute", lg: "relative" }}
            zIndex={{ base: 10, lg: 1 }}
            top={0}
            left={0}
            transition="all 0.3s ease"
          >
            <VStack spacing={4}>
              <Link to="/app/files">
                <Button>Go to files</Button>
              </Link>
              {sftpServers.servers.map((server) => (
                <Card key={server.id}>
                  <CardBody>
                    <Stack spacing={2}>
                      <Text>
                        <strong>Host:</strong> {server.host}
                      </Text>
                      <Text>
                        <strong>Status:</strong> {server.status}
                      </Text>
                      <Stack
                        direction="row"
                        spacing={2}
                        justify="space-between"
                      >
                        <Button
                          colorScheme="green"
                          onClick={() => handleConnect(server._id)}
                        >
                          Connect
                        </Button>
                        <Button
                          colorScheme="blue"
                          onClick={() => handleSshLaunch(server._id)}
                        >
                          SSH
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

            {/* Close button for mobile */}
            {!isDesktop && (
              <Button
                mt={4}
                colorScheme="red"
                onClick={() => setShowSidebar(false)}
              >
                Close Sidebar
              </Button>
            )}
          </Box>
        ) : null}

        <Box
          flex={1}
          p={4}
          ml={{ base: 0, lg: "30px" }} // Adjust margin for the sidebar on desktop
          transition="margin 0.3s ease"
        >
          <Heading size="lg">Connected to: {files.host}</Heading>
          {selectedServer ? (
            view === "files" ? (
              <SftpFileFolderView
                files={files.files}
                folders={files.folders}
                onFolderClick={(folderName) => handleListDirectory(folderName)}
                onDownload={(filename) => downloadFile(filename)}
                currentDirectory={files.currentDirectory}
                changeDir={(dir) => changeDirectory(dir)}
                serverId={selectedServer}
                onDelete={deleteFile}
              />
            ) : (
              <Box >
                <SshConsole serverId={selectedServer} />
                 </Box>
              
            )
          ) : (
            <Text>Select a server to connect to.</Text>
          )}
        </Box>
      </Flex>
    </Flex>
  );
};

export default SFTPApp;
