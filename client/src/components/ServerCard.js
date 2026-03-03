import { Text, Box, Flex, Tooltip, Icon } from "@chakra-ui/react";
import {
  FiFileText,
  FiTerminal,
  FiTrash2,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";

const ActionBtn = ({ icon, label, color, onClick }) => (
  <Tooltip label={label} hasArrow openDelay={400}>
    <Flex
      w="28px"
      h="28px"
      align="center"
      justify="center"
      borderRadius="6px"
      cursor="pointer"
      color={color || "rgba(255,255,255,0.35)"}
      transition="all 0.12s"
      _hover={{
        bg: "rgba(255,255,255,0.07)",
        color: color || "rgba(255,255,255,0.8)",
      }}
      onClick={onClick}
    >
      <Icon as={icon} boxSize="14px" />
    </Flex>
  </Tooltip>
);

export default function ServerCard({
  serverId,
  serverName,
  serverStatuses,
  handleConnect,
  handleSshLaunch,
  deleteServer,
}) {
  const status = serverStatuses[serverId];
  const isOnline = status === "online";
  const isLoading = !status;

  return (
    <Box
      px={3}
      py="10px"
      borderRadius="8px"
      border="1px solid rgba(255,255,255,0.06)"
      bg="rgba(255,255,255,0.02)"
      transition="all 0.12s"
      role="group"
      _hover={{
        bg: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <Flex align="center" justify="space-between" mb="6px">
        {/* Hostname */}
        <Text
          fontSize="12px"
          fontWeight={600}
          color="rgba(255,255,255,0.75)"
          fontFamily="'JetBrains Mono', monospace"
          noOfLines={1}
          maxW="130px"
          letterSpacing="-0.01em"
          _groupHover={{ color: "rgba(255,255,255,0.95)" }}
          transition="color 0.12s"
        >
          {serverName}
        </Text>

        {/* Status dot */}
        {isLoading ? (
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="rgba(255,255,255,0.15)"
            animation="pulse 1.5s infinite"
          />
        ) : (
          <Flex align="center" gap={1}>
            <Box
              w="6px"
              h="6px"
              borderRadius="full"
              bg={isOnline ? "#22C55E" : "#EF4444"}
              boxShadow={isOnline ? "0 0 6px rgba(34,197,94,0.6)" : "none"}
            />
            <Text
              fontSize="10px"
              color={isOnline ? "#4ADE80" : "rgba(239,68,68,0.7)"}
              letterSpacing="0.04em"
            >
              {status}
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Actions */}
      <Flex gap={1}>
        <ActionBtn
          icon={FiFileText}
          label="SFTP"
          color="rgba(34,197,94,0.7)"
          onClick={handleConnect}
        />
        <ActionBtn
          icon={FiTerminal}
          label="SSH"
          color="rgba(99,102,241,0.7)"
          onClick={handleSshLaunch}
        />
        <Box flex={1} />
        <ActionBtn
          icon={FiTrash2}
          label="Delete"
          color="rgba(239,68,68,0.5)"
          onClick={deleteServer}
        />
      </Flex>
    </Box>
  );
}
