import React, { memo } from "react";
import { Box, VStack, Text, Flex, Icon } from "@chakra-ui/react";
import { FiPlusCircle, FiHardDrive, FiLink, FiRepeat } from "react-icons/fi";

import ServerCard from "../components/ServerCard";

const NavButton = ({ icon, label, onClick }) => (
  <Flex
    align="center"
    gap={3}
    px={3}
    h="36px"
    borderRadius="7px"
    cursor="pointer"
    transition="all 0.12s"
    color="rgba(255,255,255,0.45)"
    borderLeft="2px solid transparent"
    _hover={{
      bg: "rgba(255,255,255,0.05)",
      color: "rgba(255,255,255,0.8)",
    }}
    onClick={onClick}
    w="100%"
  >
    <Icon as={icon} boxSize="15px" flexShrink={0} />

    <Text fontSize="13px" fontWeight={450} letterSpacing="-0.01em">
      {label}
    </Text>
  </Flex>
);

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
}) {
  const servers = sftpServers?.servers ?? [];

  return (
    <Box
      w="240px"
      minH="100vh"
      maxH="100vh"
      overflowY="auto"
      bg="gray.900"
      borderRight="1px solid rgba(255,255,255,0.07)"
      display="flex"
      flexDirection="column"
      position={{ base: "absolute", lg: "relative" }}
      zIndex={{ base: 10, lg: 1 }}
      top={0}
      left={0}
      sx={{
        "::-webkit-scrollbar": {
          width: "4px",
        },
        "::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.1)",
          borderRadius: "2px",
        },
        "::-webkit-scrollbar-track": {
          background: "transparent",
        },
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      {/* Navigation */}
      <VStack align="stretch" spacing={1} p={3} pt={4}>
        <Text
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.35)"
          px={3}
          pb={1}
        >
          Navigation
        </Text>

        <NavButton icon={FiHardDrive} label="Local" onClick={onLocalFiles} />
        <NavButton icon={FiHardDrive} label="Settings" onClick={onSettings} />
        <NavButton icon={FiLink} label="Shared Links" onClick={onSharedLinks} />

        <NavButton icon={FiRepeat} label="Transfers" onClick={onTransfers} />

        <NavButton
          icon={FiPlusCircle}
          label="Add Server"
          onClick={onNewServer}
        />
      </VStack>

      <Box mx={3} my={1} h="1px" bg="rgba(255,255,255,0.06)" />

      {/* Servers */}
      <VStack align="stretch" spacing={1} p={3} flex={1}>
        <Text
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.35)"
          px={3}
          pb={1}
        >
          Servers
          <Text as="span" ml={2} color="rgba(255,255,255,0.35)">
            {servers.length}
          </Text>
        </Text>

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
            h="60px"
            borderRadius="8px"
            border="1px dashed rgba(255,255,255,0.08)"
            mx={1}
          >
            <Text fontSize="12px" color="rgba(255,255,255,0.2)">
              No servers yet
            </Text>
          </Flex>
        )}
      </VStack>
    </Box>
  );
});

export default Sidebar;
