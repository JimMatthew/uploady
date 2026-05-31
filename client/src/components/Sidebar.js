import React, { memo } from "react";
import { Box, VStack, Text, Flex, Icon } from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import {
  FiFolder,
  FiPlusCircle,
  FiHardDrive,
  FiLink,
  FiX,
  FiMonitor,
  FiRepeat
} from "react-icons/fi";
import ServerCard from "../components/ServerCard";

const NavButton = ({ icon, label, onClick, to, active }) => {
  const content = (
    <Flex
      align="center"
      gap={3}
      px={3}
      h="36px"
      borderRadius="7px"
      cursor="pointer"
      transition="all 0.12s"
      bg={active ? "rgba(99,102,241,0.15)" : "transparent"}
      color={active ? "#818CF8" : "rgba(255,255,255,0.45)"}
      borderLeft="2px solid"
      borderLeftColor={active ? "#6366F1" : "transparent"}
      _hover={{
        bg: active ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
        color: active ? "#818CF8" : "rgba(255,255,255,0.8)",
      }}
      onClick={onClick}
      w="100%"
    >
      <Icon as={icon} boxSize="15px" flexShrink={0} />
      <Text
        fontSize="13px"
        fontWeight={active ? 600 : 450}
        letterSpacing="-0.01em"
      >
        {label}
      </Text>
    </Flex>
  );
  return to ? (
    <Link to={to} style={{ width: "100%" }}>
      {content}
    </Link>
  ) : (
    content
  );
};

const Sidebar = memo(function Sidebar ({
  handleConnect,
  handleLocalTab,
  handleNewServer,
  handleSshLaunch,
  handleSharedLinks,
  handleTransfers,
  deleteServer,
  sftpServers,
  serverStatuses,
}) {
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
        "::-webkit-scrollbar": { width: "4px" },
        "::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.1)",
          borderRadius: "2px",
        },
        "::-webkit-scrollbar-track": { background: "transparent" },
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      {/* Nav section */}
      <VStack align="stretch" spacing={1} p={3} pt={4}>
        {/* Section label */}
        <Text
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="rgba(255, 255, 255, 0.35)"
          px={3}
          pb={1}
        >
          Navigation
        </Text>

        <NavButton icon={FiFolder} label="Files" to="/app/files" />
        <NavButton icon={FiHardDrive} label="Local" onClick={handleLocalTab} />
        <NavButton
          icon={FiLink}
          label="Shared Links"
          onClick={handleSharedLinks}
        />
        <NavButton icon={FiRepeat} label="Transfers" onClick={handleTransfers} /> 
        <NavButton
          icon={FiPlusCircle}
          label="Add Server"
          onClick={handleNewServer}
        />
      </VStack>

      {/* Divider */}
      <Box mx={3} my={1} h="1px" bg="rgba(255,255,255,0.06)" />

      {/* Servers section */}
      <VStack align="stretch" spacing={1} p={3} flex={1}>
        <Text
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="rgba(255, 255, 255, 0.35)"
          px={3}
          pb={1}
        >
          Servers
          <Text as="span" ml={2} color="rgba(255, 255, 255, 0.35)">
            {sftpServers?.servers?.length || 0}
          </Text>
        </Text>

        {sftpServers?.servers?.length > 0 ? (
          sftpServers.servers.map((server) => (
            <ServerCard
              key={server._id}
              serverId={server._id}
              serverName={server.host}
              serverStatuses={serverStatuses}
              handleConnect={() => handleConnect(server)}
              handleSshLaunch={() => handleSshLaunch(server)}
              deleteServer={() => deleteServer(server._id)}
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
