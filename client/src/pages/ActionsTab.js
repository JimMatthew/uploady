import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  Textarea,
  Select,
  Button,
  Spinner,
  Icon,
  Badge,
  Spacer,
} from "@chakra-ui/react";
import {
  FiPlay,
  FiTrash2,
  FiPlus,
  FiTerminal,
  FiZap,
  FiMaximize2,
  FiMinimize2,
} from "react-icons/fi";

import apiClient from "../services/apiClient";

const emptyAction = {
  name: "",
  description: "",
  serverId: "",
  command: "",
  mode: "capture",
};

const Actions = ({ toast, servers = [], openSsh }) => {
  const serverList = servers?.servers ?? [];
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState(null);

  const [newAction, setNewAction] = useState(emptyAction);

  const [outputs, setOutputs] = useState({});

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const loadActions = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiClient.get("/api/actions");

      setActions(data);
    } catch (err) {
      // ...
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const createAction = async () => {
    const name = newAction.name.trim();
    const command = newAction.command.trim();

    if (!name) {
      toast?.({
        title: "Action name required",
        status: "warning",
      });

      return;
    }

    if (!newAction.serverId) {
      toast?.({
        title: "Server required",
        status: "warning",
      });

      return;
    }

    if (!command) {
      toast?.({
        title: "Command required",
        status: "warning",
      });

      return;
    }

    setCreating(true);

    try {
      const created = await apiClient.post("/api/actions", {
        name,
        description: newAction.description.trim(),
        serverId: newAction.serverId,
        command,
        mode: newAction.mode,
      });

      setActions((prev) => [...prev, created]);
      setNewAction(emptyAction);

      toast?.({
        title: "Action created",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to create action:", err);

      toast?.({
        title: "Failed to create action",
        description: err.message,
        status: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteAction = async (action) => {
    const confirmed = window.confirm(`Delete action "${action.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/api/actions/${action._id}`);

      setActions((prev) => prev.filter((item) => item._id !== action._id));

      setOutputs((prev) => {
        const next = { ...prev };
        delete next[action._id];
        return next;
      });

      toast?.({
        title: "Action deleted",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to delete action:", err);

      toast?.({
        title: "Failed to delete action",
        description: err.message,
        status: "error",
      });
    }
  };

  const executeAction = async (action) => {
    setRunningId(action._id);

    try {
      const result = await apiClient.post(`/api/actions/${action._id}/run`);

      if (result.mode === "capture") {
        setOutputs((prev) => ({
          ...prev,
          [action._id]: result.output ?? result,
        }));

        return;
      }

      if (result.mode === "terminal") {
        const server = serverList.find(
          (server) => server._id === result.serverId,
        );

        if (!server) {
          throw new Error("Server not found");
        }

        openSsh(server, {
          initialCommand: result.command,
        });
      }
    } catch (err) {
      console.error("Failed to execute action:", err);

      toast?.({
        title: "Action failed",
        description: err.message,
        status: "error",
      });
    } finally {
      setRunningId(null);
    }
  };

  const getServerName = (serverId) => {
    const server = serverList.find((item) => item._id === serverId);

    return server?.name || server?.host || server?.hostname || serverId;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box h="100%" overflowY="auto" px={{ base: 4, md: 8 }} py={6}>
      <Box maxW="900px" mx="auto">
        <Box mb={8}>
          <Text fontSize="20px" fontWeight={600} color="rgba(255,255,255,0.9)">
            Actions
          </Text>

          <Text mt={1} fontSize="13px" color="rgba(255,255,255,0.35)">
            Save and execute reusable SSH commands.
          </Text>
        </Box>

        {/* Create Action */}
        <ActionSection
          icon={FiPlus}
          title="New Action"
          description="Create a reusable command for one of your servers."
        >
          <Flex direction={{ base: "column", md: "row" }} gap={3} mb={3}>
            <ActionInput
              value={newAction.name}
              onChange={(event) =>
                setNewAction((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Action name"
              flex={1}
            />

            <ActionSelect
              value={newAction.serverId}
              onChange={(event) =>
                setNewAction((prev) => ({
                  ...prev,
                  serverId: event.target.value,
                }))
              }
              maxW={{ base: "100%", md: "240px" }}
            >
              <option value="">Select server</option>

              {serverList.map((server) => (
                <option key={server._id} value={server._id}>
                  {server.name || server.host || server.hostname}
                </option>
              ))}
            </ActionSelect>

            <ActionSelect
              value={newAction.mode}
              onChange={(event) =>
                setNewAction((prev) => ({
                  ...prev,
                  mode: event.target.value,
                }))
              }
              maxW={{ base: "100%", md: "170px" }}
            >
              <option value="capture">Capture Output</option>

              <option value="terminal">Open Terminal</option>
            </ActionSelect>
          </Flex>

          <ActionInput
            value={newAction.description}
            onChange={(event) =>
              setNewAction((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="Description (optional)"
            mb={3}
          />

          <Textarea
            value={newAction.command}
            onChange={(event) =>
              setNewAction((prev) => ({
                ...prev,
                command: event.target.value,
              }))
            }
            placeholder="Command"
            size="sm"
            minH="90px"
            resize="vertical"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="12px"
            borderColor="rgba(255,255,255,0.08)"
            bg="rgba(255,255,255,0.025)"
            _hover={{
              borderColor: "rgba(255,255,255,0.15)",
            }}
            _focusVisible={{
              borderColor: "#6366F1",
              boxShadow: "none",
            }}
          />

          <Flex justify="flex-end" mt={4}>
            <Button
              size="sm"
              leftIcon={<FiPlus />}
              onClick={createAction}
              isLoading={creating}
              bg="rgba(99,102,241,0.15)"
              color="#A5B4FC"
              border="1px solid rgba(99,102,241,0.3)"
              _hover={{
                bg: "rgba(99,102,241,0.25)",
              }}
            >
              Create Action
            </Button>
          </Flex>
        </ActionSection>

        {/* Saved Actions */}
        <ActionSection
          icon={FiZap}
          title="Saved Actions"
          description="Run or manage reusable SSH commands."
        >
          {loading ? (
            <Flex align="center" justify="center" py={8} gap={3}>
              <Spinner size="sm" />

              <Text fontSize="12px" color="rgba(255,255,255,0.3)">
                Loading actions...
              </Text>
            </Flex>
          ) : actions.length === 0 ? (
            <Box
              py={8}
              textAlign="center"
              border="1px dashed rgba(255,255,255,0.08)"
              borderRadius="8px"
            >
              <Text fontSize="13px" color="rgba(255,255,255,0.3)">
                No saved actions.
              </Text>
            </Box>
          ) : (
            <Flex direction="column" gap={2}>
              {actions.map((action) => (
                <ActionRow
                  key={action._id}
                  action={action}
                  serverName={getServerName(action.serverId)}
                  output={outputs[action._id]}
                  isRunning={runningId === action._id}
                  onExecute={() => executeAction(action)}
                  onDelete={() => deleteAction(action)}
                />
              ))}
            </Flex>
          )}
        </ActionSection>
      </Box>
    </Box>
  );
};

const ActionSection = ({ icon, title, description, children }) => {
  return (
    <Box
      mb={5}
      border="1px solid rgba(255,255,255,0.06)"
      borderRadius="10px"
      bg="rgba(255,255,255,0.015)"
      overflow="hidden"
    >
      <Flex
        align="center"
        gap={3}
        px={5}
        py={4}
        borderBottom="1px solid rgba(255,255,255,0.06)"
      >
        <Flex
          align="center"
          justify="center"
          w="30px"
          h="30px"
          borderRadius="7px"
          bg="rgba(99,102,241,0.1)"
          color="#818CF8"
          flexShrink={0}
        >
          <Icon as={icon} boxSize="14px" />
        </Flex>

        <Box>
          <Text fontSize="13px" fontWeight={600} color="rgba(255,255,255,0.8)">
            {title}
          </Text>

          <Text fontSize="11px" color="rgba(255,255,255,0.3)">
            {description}
          </Text>
        </Box>
      </Flex>

      <Box p={5}>{children}</Box>
    </Box>
  );
};

const ActionRow = ({
  action,
  serverName,
  output,
  isRunning,
  onExecute,
  onDelete,
}) => {
  const [outputExpanded, setOutputExpanded] = useState(false);
  return (
    <Box
      px={4}
      py={3}
      border="1px solid rgba(255,255,255,0.06)"
      borderRadius="8px"
      bg="rgba(0,0,0,0.12)"
    >
      <Flex
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        direction={{ base: "column", md: "row" }}
        gap={3}
      >
        <Box minW={0} flex={1}>
          <Flex align="center" gap={2}>
            <Text
              fontSize="13px"
              fontWeight={600}
              color="rgba(255,255,255,0.8)"
            >
              {action.name}
            </Text>

            <Badge
              bg={
                action.mode === "terminal"
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(99,102,241,0.1)"
              }
              color={action.mode === "terminal" ? "#86EFAC" : "#A5B4FC"}
              border="1px solid"
              borderColor={
                action.mode === "terminal"
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(99,102,241,0.2)"
              }
              fontSize="9px"
              fontWeight={500}
              textTransform="uppercase"
            >
              {action.mode}
            </Badge>
          </Flex>

          {action.description && (
            <Text mt={1} fontSize="11px" color="rgba(255,255,255,0.35)">
              {action.description}
            </Text>
          )}

          <Flex mt={2} align="center" gap={2} color="rgba(255,255,255,0.25)">
            <Icon as={FiTerminal} boxSize="11px" />

            <Text fontSize="10px">{serverName}</Text>

            <Text
              fontSize="10px"
              fontFamily="'JetBrains Mono', monospace"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {action.command}
            </Text>
          </Flex>
        </Box>

        <Flex gap={2} flexShrink={0}>
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<FiPlay />}
            onClick={onExecute}
            isLoading={isRunning}
            color="rgba(255,255,255,0.5)"
            _hover={{
              color: "#A5B4FC",
              bg: "rgba(99,102,241,0.1)",
            }}
          >
            Execute
          </Button>

          <Button
            size="xs"
            variant="ghost"
            leftIcon={<FiTrash2 />}
            onClick={onDelete}
            color="rgba(255,255,255,0.4)"
            _hover={{
              color: "#FCA5A5",
              bg: "rgba(239,68,68,0.08)",
            }}
          >
            Delete
          </Button>
        </Flex>
      </Flex>

      {output && (
        <Box mt={3} pt={3} borderTop="1px solid rgba(255,255,255,0.05)">
          <Flex justify="space-between" mb={2}>
            <Text
              fontSize="10px"
              fontWeight={600}
              color="rgba(255,255,255,0.35)"
              textTransform="uppercase"
            >
              Output
            </Text>
            <Spacer />
            <Text
              fontSize="10px"
              color={
                output.exitCode === 0
                  ? "rgba(134,239,172,0.6)"
                  : "rgba(252,165,165,0.7)"
              }
            >
              Exit {output.exitCode}
            </Text>
            <Box
              as="button"
              onClick={() => setOutputExpanded((prev) => !prev)}
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="22px"
              h="22px"
              borderRadius="5px"
              color="rgba(255,255,255,0.35)"
              _hover={{
                color: "#A5B4FC",
                bg: "rgba(99,102,241,0.1)",
              }}
              title={outputExpanded ? "Collapse output" : "Expand output"}
            >
              <Icon
                as={outputExpanded ? FiMinimize2 : FiMaximize2}
                boxSize="11px"
              />
            </Box>
          </Flex>

          {output.stdout && (
            <Box
              as="pre"
              m={0}
              p={3}
              maxH={outputExpanded ? "650px" : "300px"}
              overflow="auto"
              borderRadius="6px"
              bg="rgba(0,0,0,0.25)"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11px"
              lineHeight="1.5"
              color="rgba(255,255,255,0.65)"
              whiteSpace="pre-wrap"
              transition="max-height 0.2s ease"
            >
              {output.stdout}
            </Box>
          )}

          {output.stderr && (
            <Box
              as="pre"
              mt={output.stdout ? 2 : 0}
              mb={0}
              p={3}
              maxH="300px"
              overflow="auto"
              borderRadius="6px"
              bg="rgba(239,68,68,0.04)"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11px"
              lineHeight="1.5"
              color="rgba(252,165,165,0.7)"
              whiteSpace="pre-wrap"
            >
              {output.stderr}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

const ActionInput = (props) => (
  <Input
    size="sm"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.025)"
    _hover={{
      borderColor: "rgba(255,255,255,0.15)",
    }}
    _focusVisible={{
      borderColor: "#6366F1",
      boxShadow: "none",
    }}
    {...props}
  />
);

const ActionSelect = (props) => (
  <Select
    size="sm"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.025)"
    _hover={{
      borderColor: "rgba(255,255,255,0.15)",
    }}
    _focusVisible={{
      borderColor: "#6366F1",
      boxShadow: "none",
    }}
    {...props}
  />
);

export default Actions;
