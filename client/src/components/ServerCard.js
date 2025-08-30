import {
  Stack,
  CardBody,
  Card,
  Text,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { FaFileAlt, FaTerminal, FaTrash } from "react-icons/fa";

export default function ServerCard({  
  serverId,
  serverName,
  serverStatuses, 
  handleConnect, 
  handleSshLaunch, 
  deleteServer 
}) {
  return (
    <Card
      key={serverId}
      border="1px solid"
      borderColor="gray.300"
    >
      <CardBody>
        <Stack spacing={3}>
          <Text fontWeight="bold">
            Host:{" "}
            <span style={{ color: "gray.600" }}>
              {serverName}
            </span>
          </Text>
          <Text fontWeight="bold">
            <strong>Status:</strong>{" "}
            {serverStatuses[serverId] ? (
              <Text
                as="span"
                color={
                  serverStatuses[serverId] === "online"
                    ? "green.500"
                    : "red.500"
                }
              >
                {serverStatuses[serverId]}
              </Text>
            ) : (
              <Spinner size="sm" />
            )}
          </Text>
          <Stack
            direction="row"
            justify="space-between"
            spacing={3}
          >
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
  )
}