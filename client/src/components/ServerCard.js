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
  server, 
  serverStatuses, 
  handleConnect, 
  handleSshLaunch, 
  deleteServer 
}) {
  return (
    <Card
      key={server._id}
      border="1px solid"
      borderColor="gray.300"
    >
      <CardBody>
        <Stack spacing={3}>
          <Text fontWeight="bold">
            Host:{" "}
            <span style={{ color: "gray.600" }}>
              {server.host}
            </span>
          </Text>
          <Text fontWeight="bold">
            <strong>Status:</strong>{" "}
            {serverStatuses[server._id] ? (
              <Text
                as="span"
                color={
                  serverStatuses[server._id] === "online"
                    ? "green.500"
                    : "red.500"
                }
              >
                {serverStatuses[server._id]}
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
              onClick={() => handleConnect(server)}
            />
            <IconButton
              aria-label="SSH"
              icon={<FaTerminal />}
              colorScheme="blue"
              onClick={() => handleSshLaunch(server)}
            />
            <IconButton
              aria-label="Delete"
              icon={<FaTrash />}
              colorScheme="red"
              onClick={() => deleteServer(server._id)}
            />
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  )
}