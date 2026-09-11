import { memo } from "react";
import type { ReactNode } from "react";

import { Box, Flex, Icon, Text, VStack } from "@chakra-ui/react";

import {
  FiActivity,
  FiHardDrive,
  FiLink,
  FiPlus,
  FiRepeat,
  FiSettings,
  FiZap,
} from "react-icons/fi";

import type { IconType } from "react-icons";

import ServerCard from "../components/ServerCard";

import type {
  ServerStatuses,
  SftpServer,
} from "../types/server";

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
  onConnect: (server: SftpServer) => void;
  onLocalFiles: () => void;
  onNewServer: () => void;
  onSsh: (server: SftpServer) => void;
  onServerInfo: (server: SftpServer) => void;
  onSharedLinks: () => void;
  onTransfers: () => void;
  onDeleteServer: (serverId: string) => void | Promise<void>;
  sftpServers: SftpServer[];
  serverStatuses: ServerStatuses;
  onSettings: () => void;
  onActions: () => void;
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

const SectionLabel = ({ children, count }: SectionLabelProps) => (
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
  </Flex>
);

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
}: SidebarProps) {
  const servers = sftpServers ?? [];

  return (
    <Box
      w="240px"
      h="100%"
      overflowY="auto"
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
        <SectionLabel>Navigation</SectionLabel>

        <NavButton
          icon={FiHardDrive}
          label="Local Files"
          onClick={onLocalFiles}
        />

        <NavButton
          icon={FiZap}
          label="Actions"
          onClick={onActions}
        />

        <NavButton
          icon={FiRepeat}
          label="Transfers"
          onClick={onTransfers}
        />

        <NavButton
          icon={FiLink}
          label="Shared Links"
          onClick={onSharedLinks}
        />

        <NavButton
          icon={FiSettings}
          label="Settings"
          onClick={onSettings}
        />

        <AddServerButton onClick={onNewServer} />
      </VStack>

      <Box mx={3} my={1} h="1px" bg="rgba(255,255,255,0.06)" />

      {/* Servers */}
      <VStack align="stretch" spacing={1} p={3} flex={1}>
        <SectionLabel count={servers.length}>
          Servers
        </SectionLabel>

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

            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.25)"
            >
              No servers yet
            </Text>
          </Flex>
        )}
      </VStack>
    </Box>
  );
});

export default Sidebar;