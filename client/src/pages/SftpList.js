import React, { useState, useRef } from "react";
import {
  Box,
  Flex,
  Button,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Center,
  useColorModeValue,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useSftpList } from "../hooks/useSftpList";
import Sidebar from "../components/Sidebar";

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
    handleLocalTab,
    activeTabIndex,
    setActiveTabIndex,
    handleSharedLinks,
  } = useSftpList({ toast });

  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const bgg = useColorModeValue("gray.50", "gray.800");

  if (loading || !sftpServers) return <div>Loading...</div>;

  return (
    <Flex flex={1} direction="column">
      {!isDesktop && !showSidebar && (
        <Box width="100%" mb={2} textAlign="center">
          <Button colorScheme="blue" onClick={() => setShowSidebar(true)}>
            Show Servers
          </Button>
        </Box>
      )}

      <Flex flex={1}>
        {/* Sidebar */}
        {(isDesktop || showSidebar) && (
          <Sidebar
            handleConnect={handleConnect}
            handleLocalTab={handleLocalTab}
            handleNewServer={handleNewServer}
            handleSshLaunch={handleSshLaunch}
            handleSharedLinks={handleSharedLinks}
            deleteServer={deleteServer}
            setShowSidebar={setShowSidebar}
            isDesktop={isDesktop}
            sftpServers={sftpServers}
            serverStatuses={serverStatuses}
          />
        )}

        {/* Main Panel */}
        <Box flex={1} p={2} transition="margin 0.3s ease">
          <Tabs
            index={activeTabIndex}
            onChange={(i) => setActiveTabIndex(i)}
            isLazy
            lazyBehavior="keepMounted"
          >
            <TabList>
              {tabs.length > 0 ? (
                tabs.map((tab) => (
                  <HStack spacing={2}>
                    <Tab key={tab.id}>{tab.label}</Tab>
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
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
