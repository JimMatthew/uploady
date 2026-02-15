import React, { useState, useRef } from "react";
import {
  Box,
  Flex,
  Button,
  useColorModeValue,
  useBreakpointValue,
  Spinner
} from "@chakra-ui/react";
import { useSftpList } from "../hooks/useSftpList";
import Sidebar from "../components/Sidebar";
import TabPanelComp from "../components/TabPanel";

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

  if (loading || !sftpServers) return <div>
    <Spinner />
  </div>;

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
          <TabPanelComp 
            tabs={tabs}
            activeTabIndex={activeTabIndex}
            setActiveTabIndex={setActiveTabIndex}
            closeTab={closeTab}
          />
        </Box>
      </Flex>
    </Flex>
  );
};

export default SFTPApp;
