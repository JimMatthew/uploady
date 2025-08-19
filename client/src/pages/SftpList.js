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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Spacer,
  IconButton,
  Center,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import SftpFileFolderView from "./SftpFileFolderViewer";
import SshConsole from "./SshConsole";
import AddServer from "../components/AddServer";
import { FaFileAlt, FaTerminal, FaTrash } from "react-icons/fa";
import FileEdit from "./FileEdit";
import { useNavigate } from "react-router-dom";
import {
  SaveServer,
  DeleteServer,
  fetchServerStatuses,
} from "../controllers/StoreServer";
const SFTPApp = ({ toast }) => {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [sftpServers, setSftpServers] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [serverStatuses, setServerStatuses] = useState({});
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const bgg = useColorModeValue("gray.50", "gray.800");
  const navigate = useNavigate();
  const addTabItem = ({ id, label, content }) => {
    const newTab = {
      id,
      label,
      content,
    };
    setTabs((prevTabs) => [...prevTabs, newTab]);
  };

  const closeTab = (indexToRemove) => {
    setTabs((prevTabs) =>
      prevTabs.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleOpenFile = async (serverId, currentDirectory, filename) => {
    addTabItem({
      id: filename,
      label: filename,
      content: (
        <FileEdit
          serverId={serverId}
          currentDirectory={currentDirectory}
          filename={filename}
          toast={toast}
        />
      ),
    });
  };

  const handleSshLaunch = (server) => {
    addTabItem({
      id: server._id,
      label: `${server.host} - SSH`,
      content: <SshConsole serverId={server._id} />,
    });
  };

  const handleNewServer = () => {
    addTabItem({
      id: "new",
      label: "New Server",
      content: <AddServer handleSaveServer={handleSaveServer} />,
    });
  };

  useEffect(() => {
    if (token) {
      fetchFiles();
    } else {
      navigate("/");
      console.error("No token found");
    }
  }, []);

  const handleConnect = async (server) => {
    addTabItem({
      id: server._id,
      label: `${server.host} - SFTP`,
      content: (
        <SftpFileFolderView
          serverId={server._id}
          toast={toast}
          openFile={handleOpenFile}
        />
      ),
    });
  };

  const handleSaveServer = async (host, username, password) => {
    await SaveServer({ host, username, password, toast });
    fetchFiles();
  };

  const deleteServer = async (serverId) => {
    await DeleteServer({ serverId: serverId, toast: toast });
    fetchFiles();
  };

  const fetchFiles = async () => {
    setLoading(true);
    fetch("/sftp/api/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSftpServers(data);
        return data;
      })
      .then((data) => fetchServerStatuses({ data, setServerStatuses }))
      .then(setLoading(false))
      .catch((err) => console.error("Error fetching files:", err));
  };
  if (loading || !sftpServers) return <div>Loading...</div>;

  return (
    <Flex flex={1} minHeight="100%" direction="column">
      {/* "Show" button for mobile view */}
      {!isDesktop && !showSidebar && (
        <Box width="100%" mb={2} textAlign="center">
          <Button colorScheme="blue" onClick={() => setShowSidebar(true)}>
            Show Servers
          </Button>
        </Box>
      )}

      {/* Flex container for Sidebar and Main Panel */}
      <Flex flex={1}>
        {/* Sidebar for SFTP Server List */}
        {isDesktop || showSidebar ? (
          <Box
            width={{ base: "100%", lg: "300px" }}
            bg={bgg}
            p={4}
            borderRight="1px solid"
            borderColor="gray.200"
            minHeight="100vh"
            position={{ base: "absolute", lg: "relative" }}
            zIndex={{ base: 10, lg: 1 }}
            top={0}
            left={0}
            transition="all 0.3s ease"
          >
            <VStack spacing={6}>
              <Link to="/app/files">
                <Button colorScheme="teal" width="100%">
                  Go to Files
                </Button>
              </Link>

              <Button
                colorScheme="blue"
                width="100%"
                onClick={() => handleNewServer()}
              >
                Add New Server
              </Button>

              {/* List of Servers */}
              {sftpServers.servers.length > 0 ? (
                sftpServers.servers.map((server) => (
                  <Card
                    key={server._id}
                    border="1px solid"
                    borderColor="gray.300"
                  >
                    <CardBody>
                      <Stack spacing={3}>
                        <Text fontWeight="bold">
                          Host:{" "}
                          <span style={{ color: "gray.600" }}>
                            {server.host}
                          </span>
                        </Text>
                        <Text fontWeight="bold">
                          <strong>Status:</strong>{" "}
                          {serverStatuses[server._id] ? (
                            <Text
                              as="span"
                              color={
                                serverStatuses[server._id] === "online"
                                  ? "green.500"
                                  : "red.500"
                              }
                            >
                              {serverStatuses[server._id]}
                            </Text>
                          ) : (
                            <Spinner size="sm" />
                          )}
                        </Text>
                        <Stack
                          direction="row"
                          justify="space-between"
                          spacing={3}
                        >
                          <IconButton
                            aria-label="SFTP"
                            icon={<FaFileAlt />}
                            colorScheme="green"
                            onClick={() => handleConnect(server)}
                          />
                          <IconButton
                            aria-label="SSH"
                            icon={<FaTerminal />}
                            colorScheme="blue"
                            onClick={() => handleSshLaunch(server)}
                          />
                          <IconButton
                            aria-label="Delete"
                            icon={<FaTrash />}
                            colorScheme="red"
                            onClick={() => deleteServer(server._id)}
                          />
                        </Stack>
                      </Stack>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <Text color="gray.500">No servers available.</Text>
              )}

              <Spacer />
            </VStack>

            {/* Close Sidebar Button for Mobile */}
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

        {/* Main Panel */}
        <Box
          flex={1}
          p={2}
          ml={{ base: 0, lg: "30px" }}
          transition="margin 0.3s ease"
        >
          <Tabs>
            <TabList>
              {tabs.length > 0 ? (
                tabs.map((tab, index) => (
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
                ))
              ) : (
                <Text color="gray.500" fontSize="lg">
                  No open tabs. Select a server to begin.
                </Text>
              )}
            </TabList>

            <TabPanels>
              {tabs.length > 0 ? (
                tabs.map((tab) => (
                  <TabPanel p={{ base: 1, md: 4 }} key={tab.id}>
                    {tab.content}
                  </TabPanel>
                ))
              ) : (
                <Center height="300px">
                  <Box textAlign="center">
                    <Text fontSize="lg" color="gray.500">
                      No tabs open. Please select a server from the list to
                      start.
                    </Text>
                  </Box>
                </Center>
              )}
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </Flex>
  );
};

export default SFTPApp;
