import {
  Box,
  Flex,
  Icon,
  Spinner,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";

import { FiSidebar } from "react-icons/fi";
import { useWorkspace } from "../hooks/useWorkspace";
import Sidebar from "../components/Sidebar";
import TabPanelComp from "../components/TabPanel";
import type { AppToast } from "../hooks/useAppToast";

interface WorkspaceProps {
  toast: AppToast;
}

const Workspace = ({ toast }: WorkspaceProps) => {
  const {
    loading,
    sftpServers,
    serverStatuses,

    showSidebar,
    setShowSidebar,

    tabs,
    activeTabIndex,
    setActiveTabIndex,
    closeTab,

    openSftp,
    openSsh,
    openServerInfo,
    openNewServer,
    openLocalFiles,
    openSharedLinks,
    openTransfers,
    openSettings,
    openActions,
    deleteServer,
  } = useWorkspace({ toast });

  const isDesktop = useBreakpointValue({
    base: false,
    lg: true,
  });

  if (loading) {
    return (
      <Flex
        align="center"
        justify="center"
        h="100%"
        direction="column"
        gap={3}
        bg="#151821"
      >
        <Flex
          align="center"
          justify="center"
          w="34px"
          h="34px"
          borderRadius="9px"
          bg="rgba(255,255,255,0.025)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.065)"
        >
          <Spinner size="sm" thickness="2px" color="#818CF8" opacity={0.7} />
        </Flex>

        <Text
          fontSize="11px"
          fontWeight={500}
          color="rgba(255,255,255,0.28)"
          fontFamily="'JetBrains Mono', monospace"
        >
          Initializing…
        </Text>
      </Flex>
    );
  }

  return (
    <Flex h="100%" minH={0} direction="column" overflow="hidden" bg="#151821">
      {/* Mobile header */}
      {!isDesktop && !showSidebar && (
        <Flex
          align="center"
          justify="space-between"
          px={4}
          h="44px"
          flexShrink={0}
          borderBottom="1px solid"
          borderColor="rgba(255,255,255,0.06)"
          bg="rgba(21,24,33,0.96)"
          backdropFilter="blur(10px)"
        >
          <Text
            fontSize="10px"
            fontWeight={700}
            color="rgba(255,255,255,0.38)"
            letterSpacing="0.1em"
            textTransform="uppercase"
            fontFamily="'JetBrains Mono', monospace"
          >
            Uploady
          </Text>

          <Flex
            align="center"
            gap={2}
            px="10px"
            h="28px"
            borderRadius="7px"
            border="1px solid"
            borderColor="rgba(255,255,255,0.08)"
            bg="rgba(255,255,255,0.025)"
            cursor="pointer"
            color="rgba(255,255,255,0.46)"
            transition="
              background 120ms ease,
              border-color 120ms ease,
              color 120ms ease
            "
            onClick={() => setShowSidebar(true)}
            _hover={{
              bg: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.82)",
            }}
          >
            <Icon as={FiSidebar} boxSize="12px" />

            <Text fontSize="11px" fontWeight={500}>
              Servers
            </Text>
          </Flex>
        </Flex>
      )}

      {/* Workspace body */}
      <Flex flex={1} minH={0} overflow="hidden" position="relative">
        {/* Mobile overlay */}
        {!isDesktop && showSidebar && (
          <Box
            position="absolute"
            inset={0}
            left="240px"
            zIndex={19}
            bg="rgba(0,0,0,0.46)"
            backdropFilter="blur(2px)"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        {(isDesktop || showSidebar) && (
          <Box
            w="240px"
            h="100%"
            minH={0}
            flexShrink={0}
            position={{
              base: "absolute",
              lg: "relative",
            }}
            top={0}
            left={0}
            zIndex={20}
          >
            <Sidebar
              onConnect={openSftp}
              onLocalFiles={openLocalFiles}
              onNewServer={openNewServer}
              onSsh={openSsh}
              onServerInfo={openServerInfo}
              onSharedLinks={openSharedLinks}
              onTransfers={openTransfers}
              onDeleteServer={deleteServer}
              sftpServers={sftpServers}
              serverStatuses={serverStatuses}
              onSettings={openSettings}
              onActions={openActions}
            />
          </Box>
        )}

        {/* Main workspace */}
        <Box flex={1} h="100%" minH={0} minW={0} overflow="hidden" bg="#1B1F2A">
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

export default Workspace;
