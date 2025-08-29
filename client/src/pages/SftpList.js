import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Button,
  VStack,
  useBreakpointValue,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Spacer,
  Center,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useSftpList } from "../hooks/useSftpList";
import ServerCard from "../components/ServerCard";
const SFTPApp = ({ toast }) => {
  const {
    loading,
    sftpServers,
    showSidebar,
    setShowSidebar,
    tabs,
    serverStatuses,
    closeTab,
    handleNewServer,
    handleSshLaunch,
    deleteServer,
    handleConnect,
  } = useSftpList({ toast });
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const bgg = useColorModeValue("gray.50", "gray.800");
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
            maxHeight="100vh"
            overflowY="auto"
            position={{ base: "absolute", lg: "relative" }}
            zIndex={{ base: 10, lg: 1 }}
            top={0}
            left={0}
            transition="all 0.3s ease"
            sx={{
              /* For Webkit browsers (Chrome, Edge, Safari) */
              "::-webkit-scrollbar": {
                width: "6px",
              },
              "::-webkit-scrollbar-thumb": {
                background: "rgba(100, 100, 100, 0.3)",
                borderRadius: "3px",
              },
              "::-webkit-scrollbar-thumb:hover": {
                background: "rgba(100, 100, 100, 0.5)",
              },
              "::-webkit-scrollbar-track": {
                background: "transparent",
              },
              /* For Firefox */
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(100, 100, 100, 0.3) transparent",
            }}
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
                  <ServerCard
                    server={server}
                    serverStatuses={serverStatuses}
                    handleConnect={handleConnect}
                    handleSshLaunch={handleSshLaunch}
                    deleteServer={deleteServer}
                  />
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
