import React from "react";
import {
  Box,
  Flex,
  Text,
  Icon,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import { FiSidebar } from "react-icons/fi";
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
        h="100%"
        direction="column"
        gap={3}
      >
        <Box position="relative">
          <Spinner size="sm" color="rgba(99,102,241,0.5)" />
          <Box
            position="absolute"
            inset={0}
            borderRadius="full"
            boxShadow="0 0 12px rgba(99,102,241,0.3)"
          />
        </Box>
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
          bg="rgba(8,8,12,0.6)"
        >
          <Text
            fontSize="11px"
            fontWeight={700}
            color="rgba(255,255,255,0.35)"
            letterSpacing="0.1em"
            textTransform="uppercase"
            fontFamily="'JetBrains Mono', monospace"
          >
            uploady
          </Text>
          <Flex
            align="center"
            gap={2}
            px={3}
            h="28px"
            borderRadius="7px"
            border="1px solid rgba(255,255,255,0.08)"
            cursor="pointer"
            color="rgba(255,255,255,0.35)"
            fontSize="12px"
            fontWeight={500}
            transition="all 0.15s"
            _hover={{
              borderColor: "rgba(99,102,241,0.4)",
              color: "#818CF8",
              bg: "rgba(99,102,241,0.08)",
            }}
            onClick={() => setShowSidebar(true)}
          >
            <Icon as={FiSidebar} boxSize="12px" />
            Servers
          </Flex>
        </Flex>
      )}

      {/* Body */}
      <Flex flex={1} overflow="hidden" position="relative">
        {/* Mobile overlay */}
        {!isDesktop && showSidebar && (
          <Box
            position="absolute"
            top={0}
            left="220px"
            right={0}
            bottom={0}
            zIndex={9}
            bg="rgba(0,0,0,0.5)"
            backdropFilter="blur(2px)"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        {(isDesktop || showSidebar) && (
          <Box
            w="230px"
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

        {/* Main tab area */}
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