import React from "react";
import { Box, Flex, Text, Icon, Spinner, useBreakpointValue } from "@chakra-ui/react";
import { FiMenu, FiSidebar } from "react-icons/fi";
import { useSftpList } from "../hooks/useSftpList";
import Sidebar from "../components/Sidebar";
import TabPanelComp from "../components/TabPanel";

const SFTPApp = ({ toast }) => {
  const {
    loading, sftpServers, showSidebar, setShowSidebar,
    tabs, serverStatuses, closeTab, handleNewServer,
    handleSshLaunch, deleteServer, handleConnect,
    handleLocalTab, activeTabIndex, setActiveTabIndex, handleSharedLinks,
  } = useSftpList({ toast });

  const isDesktop = useBreakpointValue({ base: false, lg: true });

  if (loading || !sftpServers) return (
    <Flex align="center" justify="center" h="100vh" direction="column" gap={3}
      bg="rgba(8,8,12,1)"
    >
      <Spinner size="sm" color="rgba(99,102,241,0.5)" />
      <Text fontSize="12px" color="rgba(255,255,255,0.25)">Initializing…</Text>
    </Flex>
  );

  return (
    <Flex h="100%" direction="column" bg="#0A0A0E">
      {/* Mobile sidebar toggle */}
      {!isDesktop && !showSidebar && (
        <Flex
          align="center"
          justify="space-between"
          px={4}
          h="44px"
          borderBottom="1px solid rgba(255,255,255,0.06)"
          bg="rgba(8,8,12,0.8)"
        >
          <Text
            fontSize="12px"
            fontWeight={700}
            color="rgba(255,255,255,0.5)"
            letterSpacing="0.08em"
            textTransform="uppercase"
            fontFamily="'JetBrains Mono', monospace"
          >
            uploady
          </Text>
          <Flex
            align="center"
            gap={2}
            px={3}
            h="30px"
            borderRadius="7px"
            border="1px solid rgba(255,255,255,0.09)"
            cursor="pointer"
            color="rgba(255,255,255,0.4)"
            fontSize="12px"
            fontWeight={500}
            transition="all 0.12s"
            _hover={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
            onClick={() => setShowSidebar(true)}
          >
            <Icon as={FiSidebar} boxSize="13px" />
            Servers
          </Flex>
        </Flex>
      )}

      <Flex flex={1} overflow="hidden">
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

        {/* Main tab area */}
        <Box
          flex={1}
          overflow="hidden"
          display="flex"
          flexDirection="column"
          bg="#0D0D12"
        >
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