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
  const bga = useColorModeValue("white", "gray.800")
  const bgh = useColorModeValue("gray.700", "gray.200")
  return (
    <Card
      key={serverId}
      borderWidth="1px"
      borderRadius="lg"
      shadow="md"
      bg={bga}
      transition="all 0.2s"
      
    >
      <CardBody>
        <Stack spacing={4} align="stretch">
          {/* Host */}
          <Heading size="sm" color={bgh}>
            {serverName}
          </Heading>

          {/* Status */}
          {serverStatuses[serverId] ? (
            <Badge
              alignSelf="start"
              colorScheme={
                serverStatuses[serverId] === "online" ? "green" : "red"
              }
              px={3}
              py={1}
              borderRadius="full"
              fontSize="0.8rem"
              fontWeight="bold"
              textTransform="capitalize"
            >
              {serverStatuses[serverId]}
            </Badge>
          ) : (
            <Spinner size="md" />
          )}

          {/* Actions */}
          <HStack spacing={3} pt={2} justify="flex-start">
            <Tooltip label="Open SFTP" hasArrow>
              <IconButton
                aria-label="SFTP"
                icon={<FaFileAlt />}
                colorScheme="green"
                variant="solid"
                onClick={handleConnect}
              />
            </Tooltip>
            <Tooltip label="Open SSH Terminal" hasArrow>
              <IconButton
                aria-label="SSH"
                icon={<FaTerminal />}
                colorScheme="blue"
                variant="solid"
                onClick={handleSshLaunch}
              />
            </Tooltip>
            <Tooltip label="Delete Server" hasArrow>
              <IconButton
                aria-label="Delete"
                icon={<FaTrash />}
                colorScheme="red"
                variant="ghost"
                onClick={deleteServer}
              />
            </Tooltip>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );
}
