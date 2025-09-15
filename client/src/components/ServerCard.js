import {
  Stack,
  CardBody,
  Card,
  Text,
  IconButton,
  Spinner,
  Badge,
  Spacer,
  Box,
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
  return (
    <Card key={serverId} border="1px solid" borderColor="gray.300">
      <CardBody>
        <Stack spacing={3}>
          <Text fontWeight="bold">
            Host: <span style={{ color: "gray.600" }}>{serverName}</span>
          </Text>
          {serverStatuses[serverId] ? (
            <Box>
              <Badge
                colorScheme={
                  serverStatuses[serverId] === "online" ? "green" : "red"
                }
                px={3}
                py={1}
                borderRadius="md"
              >
                {serverStatuses[serverId]}
              </Badge>
              <Spacer />
            </Box>
          ) : (
            <Spinner size="md" />
          )}
          <Stack direction="row" justify="space-between" spacing={3}>
            <IconButton
              aria-label="SFTP"
              icon={<FaFileAlt />}
              colorScheme="green"
              onClick={handleConnect}
            />
            <IconButton
              aria-label="SSH"
              icon={<FaTerminal />}
              colorScheme="blue"
              onClick={handleSshLaunch}
            />
            <IconButton
              aria-label="Delete"
              icon={<FaTrash />}
              colorScheme="red"
              onClick={deleteServer}
            />
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}
