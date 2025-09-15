import {
  Card,
  CardBody,
  Stack,
  Heading,
  Text,
  Badge,
  Spinner,
  IconButton,
  HStack,
  Tooltip,
  useColorModeValue,
  VStack,
  Box
} from "@chakra-ui/react";
import { FaFileAlt, FaTerminal, FaTrash } from "react-icons/fa";

export default function ServerCard({
  serverId,
  serverName,
  serverStatuses,
  handleConnect,
  handleSshLaunch,
  deleteServer,
}) {
  const bga = useColorModeValue("white", "gray.800");
  const bgh = useColorModeValue("gray.700", "gray.200");
  return (
    <Box
      key={serverId}
      p={3}
      borderWidth="1px"
      borderRadius="md"
      bg={useColorModeValue("gray.50", "gray.700")}
      _hover={{ bg: useColorModeValue("white", "gray.600") }}
      transition="all 0.2s ease"
      mb={2}
    >
      <VStack align="start" spacing={2}>
        {/* Host name */}
        <Text fontWeight="semibold" fontSize="sm" isTruncated maxW="180px">
          {serverName}
        </Text>

        {/* Status */}
        {serverStatuses[serverId] ? (
          <Badge
            colorScheme={
              serverStatuses[serverId] === "online" ? "green" : "red"
            }
            size="sm"
            borderRadius="full"
            px={2}
          >
            {serverStatuses[serverId]}
          </Badge>
        ) : (
          <Spinner size="sm" />
        )}

        {/* Actions */}
        <HStack spacing={1}>
          <Tooltip label="SFTP" hasArrow>
            <IconButton
              aria-label="SFTP"
              icon={<FaFileAlt />}
              colorScheme="green"
              size="sm"
              variant="ghost"
              onClick={handleConnect}
            />
          </Tooltip>
          <Tooltip label="SSH" hasArrow>
            <IconButton
              aria-label="SSH"
              icon={<FaTerminal />}
              colorScheme="blue"
              size="sm"
              variant="ghost"
              onClick={handleSshLaunch}
            />
          </Tooltip>
          <Tooltip label="Delete" hasArrow>
            <IconButton
              aria-label="Delete"
              icon={<FaTrash />}
              colorScheme="red"
              size="sm"
              variant="ghost"
              onClick={deleteServer}
            />
          </Tooltip>
        </HStack>
      </VStack>
    </Box>
  );
}
