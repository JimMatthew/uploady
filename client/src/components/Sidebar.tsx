import type { ReactNode } from "react";
import { Box, Flex, Icon, Text, VStack } from "@chakra-ui/react";
import { memo, useState } from "react";
import {
  FiActivity,
  FiHardDrive,
  FiLink,
  FiPlus,
  FiRepeat,
  FiSettings,
  FiZap,
  FiLock,
  FiUnlock,
} from "react-icons/fi";

import type { IconType } from "react-icons";
import ServerCard from "../components/ServerCard";

import type { ServerStatuses, ServerSummary } from "../types/server";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface NavButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
}

interface AddServerButtonProps {
  onClick: () => void;
}

interface SectionLabelProps {
  children: ReactNode;
  count?: number;
}

interface SidebarProps {
  onConnect: (server: ServerSummary) => void;
  onLocalFiles: () => void;
  onNewServer: () => void;
  onSsh: (server: ServerSummary) => void;
  onServerInfo: (server: ServerSummary) => void;
  onSharedLinks: () => void;
  onTransfers: () => void;
  onDeleteServer: (serverId: string) => Promise<boolean>;
  sftpServers: ServerSummary[];
  serverStatuses: ServerStatuses;
  onSettings: () => void;
  onActions: () => void;
  onNotes: () => void;
}

// -----------------------------------------------------------------------------
// Navigation button
// -----------------------------------------------------------------------------

const NavButton = ({ icon, label, onClick }: NavButtonProps) => (
  <Flex
    align="center"
    gap={3}
    w="100%"
    h="36px"
    px={3}
    borderRadius="7px"
    cursor="pointer"
    color="rgba(255,255,255,0.48)"
    transition="
      background 120ms ease,
      color 120ms ease
    "
    onClick={onClick}
    _hover={{
      bg: "rgba(255,255,255,0.05)",
      color: "rgba(255,255,255,0.85)",
    }}
  >
    <Icon
      as={icon}
      boxSize="14px"
      flexShrink={0}
      color="rgba(255,255,255,0.36)"
    />

    <Text fontSize="13px" fontWeight={500} letterSpacing="-0.01em">
      {label}
    </Text>
  </Flex>
);

// -----------------------------------------------------------------------------
// Add server button
// -----------------------------------------------------------------------------

const AddServerButton = ({ onClick }: AddServerButtonProps) => (
  <Flex
    align="center"
    justify="center"
    gap={2}
    w="100%"
    h="34px"
    mt={1}
    borderRadius="7px"
    cursor="pointer"
    bg="rgba(129,140,248,0.07)"
    border="1px solid"
    borderColor="rgba(129,140,248,0.13)"
    color="rgba(165,180,252,0.82)"
    transition="
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease
    "
    onClick={onClick}
    _hover={{
      bg: "rgba(129,140,248,0.12)",
      borderColor: "rgba(129,140,248,0.24)",
      color: "#C7D2FE",
    }}
  >
    <Icon as={FiPlus} boxSize="13px" />

    <Text fontSize="12px" fontWeight={600} letterSpacing="-0.01em">
      Add Server
    </Text>
  </Flex>
);

// -----------------------------------------------------------------------------
// Section label
// -----------------------------------------------------------------------------

const SectionLabel = ({ children, count, action }: SectionLabelProps) => (
  <Flex align="center" justify="space-between" px={3} pb="5px">
    <Text
      fontSize="10px"
      fontWeight={700}
      letterSpacing="0.09em"
      textTransform="uppercase"
      color="rgba(255,255,255,0.32)"
    >
      {children}
    </Text>

    <Flex align="center" gap={1}>
      {count != null && (
        <Flex
          align="center"
          justify="center"
          minW="20px"
          h="18px"
          px="6px"
          borderRadius="5px"
          bg="rgba(255,255,255,0.04)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.06)"
        >
          <Text
            fontSize="9px"
            fontWeight={600}
            lineHeight={1}
            color="rgba(255,255,255,0.36)"
          >
            {count}
          </Text>
        </Flex>
      )}

      {action}
    </Flex>
  </Flex>
);

interface SectionLabelProps {
  children: ReactNode;
  count?: number;
  action?: ReactNode;
}
// -----------------------------------------------------------------------------
// Sidebar
// -----------------------------------------------------------------------------

const Sidebar = memo(function Sidebar({
  onConnect,
  onLocalFiles,
  onNewServer,
  onSsh,
  onServerInfo,
  onSharedLinks,
  onTransfers,
  onDeleteServer,
  sftpServers,
  serverStatuses,
  onSettings,
  onActions,
  onNotes,
}: SidebarProps) {
  const [navigationPinned, setNavigationPinned] = useState(true);
  const servers = sftpServers ?? [];

  return (
    <Box
      w="240px"
      h="100%"
      overflow={navigationPinned ? "hidden" : "auto"}
      bg="#151821"
      borderRight="1px solid"
      borderColor="rgba(255,255,255,0.065)"
      display="flex"
      flexDirection="column"
      position={{
        base: "absolute",
        lg: "relative",
      }}
      zIndex={{
        base: 10,
        lg: 1,
      }}
      top={0}
      left={0}
      sx={{
        "::-webkit-scrollbar": {
          width: "0px",
        },
        scrollbarWidth: "none",
      }}
    >
      {/* Navigation */}
      <VStack align="stretch" spacing={1} p={3} pt={4}>
        <SectionLabel
          action={
            <Box
              as="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="20px"
              h="20px"
              borderRadius="5px"
              color={
                navigationPinned
                  ? "rgba(165,180,252,0.8)"
                  : "rgba(255,255,255,0.28)"
              }
              _hover={{
                bg: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.8)",
              }}
              onClick={() => setNavigationPinned((pinned) => !pinned)}
              title={navigationPinned ? "Unpin navigation" : "Pin navigation"}
            >
              <Icon as={navigationPinned ? FiLock : FiUnlock} boxSize="11px" />
            </Box>
          }
        >
          Navigation
        </SectionLabel>

        <NavButton
          icon={FiHardDrive}
          label="Local Files"
          onClick={onLocalFiles}
        />

        <NavButton icon={FiZap} label="Actions" onClick={onActions} />

        <NavButton icon={FiRepeat} label="Transfers" onClick={onTransfers} />

        <NavButton icon={FiLink} label="Shared Links" onClick={onSharedLinks} />

        <NavButton icon={FiSettings} label="Settings" onClick={onSettings} />

        <NavButton icon={FiSettings} label="Notes" onClick={onNotes} />

        <AddServerButton onClick={onNewServer} />
      </VStack>

      <Box mx={3} my={1} h="1px" bg="rgba(255,255,255,0.06)" />

      {/* Servers */}
      <VStack
        align="stretch"
        spacing={1}
        p={3}
        flex={1}
        minH={0}
        overflowY={navigationPinned ? "auto" : "visible"}
        sx={{
          "::-webkit-scrollbar": {
            width: "0px",
          },
          scrollbarWidth: "none",
        }}
      >
        <SectionLabel count={servers.length}>Servers</SectionLabel>

        {servers.length > 0 ? (
          servers.map((server) => (
            <ServerCard
              key={server._id}
              serverId={server._id}
              serverName={server.host}
              serverStatuses={serverStatuses}
              onConnect={() => onConnect(server)}
              onSsh={() => onSsh(server)}
              onServerInfo={() => onServerInfo(server)}
              onDelete={() => onDeleteServer(server._id)}
            />
          ))
        ) : (
          <Flex
            align="center"
            justify="center"
            direction="column"
            gap="5px"
            h="72px"
            mx={1}
            borderRadius="8px"
            border="1px dashed"
            borderColor="rgba(255,255,255,0.08)"
            bg="rgba(255,255,255,0.012)"
          >
            <Icon
              as={FiActivity}
              boxSize="15px"
              color="rgba(255,255,255,0.16)"
            />

            <Text fontSize="11px" color="rgba(255,255,255,0.25)">
              No servers yet
            </Text>
          </Flex>
        )}
      </VStack>
    </Box>
  );
});

export default Sidebar;
