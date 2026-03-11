import React from "react";
import {
  Box,
  Flex,
  Text,
  Icon,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import { FiMenu, FiSidebar } from "react-icons/fi";
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

  if (loading || !sftpServers)
    return (
      <Flex
        align="center"
        justify="center"
        h="100vh"
        direction="column"
        gap={3}
      >
        <Spinner size="sm" color="rgba(99,102,241,0.5)" />
        <Text fontSize="12px" color="rgba(255,255,255,0.25)">
          Initializing…
        </Text>
      </Flex>
    );

  return (
    <Flex h="100%" direction="column" overflow="hidden">
      {/* Mobile sidebar toggle */}
      {!isDesktop && !showSidebar && (
        <Flex
          align="center"
          justify="space-between"
          px={4}
          h="44px"
          flexShrink={0}
          borderBottom="1px solid rgba(255,255,255,0.06)"
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
            _hover={{
              borderColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.8)",
            }}
            onClick={() => setShowSidebar(true)}
          >
            <Icon as={FiSidebar} boxSize="13px" />
            Servers
          </Flex>
        </Flex>
      )}

      {/* Body — fills remaining height */}
      <Flex flex={1} overflow="hidden" position="relative">
        {/* Mobile overlay — closes sidebar on outside tap */}
        {!isDesktop && showSidebar && (
          <Box
            position="absolute"
            top={0}
            left="220px"
            right={0}
            bottom={0}
            zIndex={9}
            bg="rgba(0,0,0,0.4)"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        {(isDesktop || showSidebar) && (
          <Box
            w="240px"
            h="100%"
            overflowY="auto"
            flexShrink={0}
            position={{ base: "absolute", lg: "relative" }}
            top={0}
            left={0}
            zIndex={20}
            css={{
              "&::-webkit-scrollbar": { width: "0px" },
              scrollbarWidth: "none",
            }}
          >
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
          </Box>
        )}

        {/* Main tab area — own scrollbar */}
        <Box flex={1} h="100%" overflowY="auto" minW={0}>
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
