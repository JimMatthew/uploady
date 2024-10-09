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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Input
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import SftpFileFolderView from "./SftpFileFolderViewer";
import SshConsole from "./SshConsole";
import AddServer from "./AddServer";
const SFTPApp = ({ toast }) => {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [newServerDetails, setNewServerDetails] = useState({
    host: "",
    username: "",
    password: "",
  });

  const addTab = (server, type) => {
    const newTab = {
      id: `${server ? server._id : 'new-server'}-${type}`,
      label: type === "Add Server" ? "Add New Server" : `${server.host} - ${type}`,
      
      content:
        type === "SFTP" ? (
          <SftpFileFolderView serverId={server._id} toast={toast} />
        ) : type === "SSH" ? (
          <SshConsole serverId={server._id} />
        ) : (
          <AddServer handleSaveServer={handleSaveServer} />
        ),
    };
    setTabs((prevTabs) => [...prevTabs, newTab]);
  };

  const closeTab = (indexToRemove) => {
    setTabs((prevTabs) =>
      prevTabs.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSshLaunch = (server) => {
    addTab(server, "SSH");
  };

  const handleAddServerLaunch = () => {
    
  }
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  useEffect(() => {
    if (token) {
      fetchFiles();
    } else {
      console.error("No token found");
    }
  }, [token]);

  const handleConnect = async (server) => {
    addTab(server, "SFTP");
  };


  const handleSaveServer = async (host, username, password) => {
    
    const response = await fetch("/sftp/api/save-server", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        host: host,
        username: username,
        password: password,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Adding Server",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    fetchFiles()
    toast({
      title: "Server created",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }

  const deleteServer = async (serverId) => {
    const response = await fetch("/sftp/api/delete-server", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },

      body: JSON.stringify({
        serverId: serverId,
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error Deleting Server",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    fetchFiles()
    toast({
      title: "Server Deleted",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleInputChange = (e) => {
    setNewServerDetails({ ...newServerDetails, [e.target.name]: e.target.value })
  }

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
    <Flex minHeight="100%" direction="column">
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
            minHeight={{ base: "100vh", lg: "100%y" }}
            position={{ base: "absolute", lg: "relative" }}
            zIndex={{ base: 10, lg: 1 }}
            top={0}
            left={0}
            transition="all 0.3s ease"
          >
            <VStack spacing={4}>
              <Link to="/app/files">
                <Button>Go to filess</Button>
              </Link>
              <Button onClick={() => addTab("new-server", "Add New Server")}>Add New Server</Button>
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
                          size="sm"
                          onClick={() => handleConnect(server)}
                        >
                          SFTP
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleSshLaunch(server)}
                        >
                          SSH
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => deleteServer(server._id)}
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
          <Tabs>
            <TabList>
              {tabs.map((tab, index) => (
                <HStack key={index} spacing={2}>
                  <Tab>{tab.label}</Tab>
                  <Button
                    size="xs"
                    colorScheme="red"
                    onClick={() => closeTab(index)}
                  >
                    ✕
                  </Button>
                </HStack>
              ))}
            </TabList>

            <TabPanels>
            {tabs.map((tab) => (
                <TabPanel key={tab.id}>{tab.content}</TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </Flex>
  );
};

export default SFTPApp;
