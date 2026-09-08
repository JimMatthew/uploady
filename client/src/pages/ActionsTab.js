import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Textarea,
  Select,
  Button,
  IconButton,
  Spinner,
  Icon,
  Badge,
  Spacer,
  Tooltip,
  Collapse,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FiPlay,
  FiTrash2,
  FiPlus,
  FiTerminal,
  FiZap,
  FiMaximize2,
  FiMinimize2,
  FiSearch,
  FiCopy,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
  FiX,
} from "react-icons/fi";

import apiClient from "../services/apiClient";
import ActionRow from "../components/actions/ActionRow"
import ActionSection from "../components/actions/ActionSection";
const emptyAction = {
  name: "",
  description: "",
  serverId: "",
  command: "",
  mode: "capture",
};

const copyToClipboard = async (text, toast, label = "Copied to clipboard") => {
  try {
    await navigator.clipboard.writeText(text);
    toast?.({ title: label, status: "success" });
  } catch (err) {
    toast?.({
      title: "Couldn't copy",
      description: "Your browser blocked clipboard access.",
      status: "error",
    });
  }
};

const Actions = ({ toast, servers = [], openSsh }) => {
  const serverList = servers?.servers ?? [];
  const hasServers = serverList.length > 0;

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  // Multiple actions can run concurrently — a slow one shouldn't block others.
  const [runningIds, setRunningIds] = useState(() => new Set());
  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const [newAction, setNewAction] = useState(emptyAction);
  const [outputs, setOutputs] = useState({});
  const [search, setSearch] = useState("");

  // Open by default so a first-time user sees the form immediately; once we
  // know they already have saved actions, collapse it to save space. Only
  // happens once, right after the initial load, so it never fights a
  // deliberate open/close the user does afterward.
  const [newActionOpen, setNewActionOpen] = useState(true);
  const hasAutoCollapsed = useRef(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const {
    isOpen: isDeleteOpen,
    onOpen: openDeleteDialog,
    onClose: closeDeleteDialog,
  } = useDisclosure();
  const cancelDeleteRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadActions = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    try {
      const data = await apiClient.get("/api/actions");
      setActions(data);
    } catch (err) {
      console.error("Failed to load actions:", err);
      setLoadFailed(true);
      toast?.({
        title: "Couldn't load actions",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    if (!loading && !hasAutoCollapsed.current) {
      hasAutoCollapsed.current = true;
      if (actions.length > 0) {
        setNewActionOpen(false);
      }
    }
  }, [loading, actions.length]);

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const createAction = async () => {
    const name = newAction.name.trim();
    const command = newAction.command.trim();

    if (!name) {
      toast?.({ title: "Action name required", status: "warning" });
      return;
    }

    if (!newAction.serverId) {
      toast?.({ title: "Server required", status: "warning" });
      return;
    }

    if (!command) {
      toast?.({ title: "Command required", status: "warning" });
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

      toast?.({ title: "Action created", status: "success" });
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

  const handleCommandKeyDown = (event) => {
    // Cmd/Ctrl+Enter submits from inside the command box, matching the
    // muscle memory people already have from terminals and chat apps.
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      createAction();
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const requestDelete = (action) => {
    setPendingDelete(action);
    openDeleteDialog();
  };

  const confirmDelete = async () => {
    const action = pendingDelete;
    if (!action) return;

    closeDeleteDialog();
    setDeletingIds((prev) => new Set(prev).add(action._id));

    try {
      await apiClient.delete(`/api/actions/${action._id}`);

      setActions((prev) => prev.filter((item) => item._id !== action._id));
      setOutputs((prev) => {
        const next = { ...prev };
        delete next[action._id];
        return next;
      });

      toast?.({ title: "Action deleted", status: "success" });
    } catch (err) {
      console.error("Failed to delete action:", err);
      toast?.({
        title: "Failed to delete action",
        description: err.message,
        status: "error",
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(action._id);
        return next;
      });
      setPendingDelete(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Execute
  // ---------------------------------------------------------------------------

  const executeAction = async (action) => {
    setRunningIds((prev) => new Set(prev).add(action._id));

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

        openSsh(server, { initialCommand: result.command });
        return;
      }

      toast?.({
        title: "Unrecognized action mode",
        description: `"${result.mode}" isn't handled yet.`,
        status: "warning",
      });
    } catch (err) {
      console.error("Failed to execute action:", err);
      toast?.({
        title: "Action failed",
        description: err.message,
        status: "error",
      });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(action._id);
        return next;
      });
    }
  };

  const clearOutput = (actionId) => {
    setOutputs((prev) => {
      const next = { ...prev };
      delete next[actionId];
      return next;
    });
  };

  const getServerName = (serverId) => {
    const server = serverList.find((item) => item._id === serverId);
    if (!server) return "Unknown server";
    return server.name || server.host || server.hostname || "Unknown server";
  };

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredActions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return actions;

    return actions.filter((action) => {
      const haystack = [
        action.name,
        action.description,
        action.command,
        getServerName(action.serverId),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, search, serverList]);

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
          collapsible
          isOpen={newActionOpen}
          onToggle={() => setNewActionOpen((prev) => !prev)}
        >
          {!hasServers && (
            <Flex
              align="center"
              gap={2}
              mb={3}
              px={3}
              py={2}
              borderRadius="6px"
              bg="rgba(250,204,21,0.06)"
              border="1px solid rgba(250,204,21,0.15)"
            >
              <Icon
                as={FiAlertCircle}
                boxSize="12px"
                color="rgba(250,204,21,0.7)"
              />
              <Text fontSize="11px" color="rgba(250,204,21,0.8)">
                Add a server before creating an action.
              </Text>
            </Flex>
          )}

          <Flex direction={{ base: "column", md: "row" }} gap={3} mb={3}>
            <ActionInput
              value={newAction.name}
              onChange={(event) =>
                setNewAction((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Action name"
              isDisabled={creating}
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
              isDisabled={creating || !hasServers}
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
                setNewAction((prev) => ({ ...prev, mode: event.target.value }))
              }
              isDisabled={creating}
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
            isDisabled={creating}
            mb={3}
          />

          <Textarea
            value={newAction.command}
            onChange={(event) =>
              setNewAction((prev) => ({ ...prev, command: event.target.value }))
            }
            onKeyDown={handleCommandKeyDown}
            placeholder="Command"
            isDisabled={creating}
            size="sm"
            minH="90px"
            resize="vertical"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="12px"
            borderColor="rgba(255,255,255,0.08)"
            bg="rgba(255,255,255,0.025)"
            _hover={{ borderColor: "rgba(255,255,255,0.15)" }}
            _focusVisible={{ borderColor: "#6366F1", boxShadow: "none" }}
          />

          <Flex justify="space-between" align="center" mt={4}>
            <Text fontSize="10px" color="rgba(255,255,255,0.25)">
              ⌘/Ctrl + Enter to create
            </Text>

            <Button
              size="sm"
              leftIcon={<FiPlus />}
              onClick={createAction}
              isLoading={creating}
              isDisabled={!hasServers}
              bg="rgba(99,102,241,0.15)"
              color="#A5B4FC"
              border="1px solid rgba(99,102,241,0.3)"
              _hover={{ bg: "rgba(99,102,241,0.25)" }}
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
          headerExtra={
            actions.length > 0 && (
              <InputGroup size="sm" maxW="220px">
                <InputLeftElement pointerEvents="none">
                  <Icon
                    as={FiSearch}
                    boxSize="12px"
                    color="rgba(255,255,255,0.25)"
                  />
                </InputLeftElement>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter actions"
                  borderColor="rgba(255,255,255,0.08)"
                  bg="rgba(255,255,255,0.025)"
                  _hover={{ borderColor: "rgba(255,255,255,0.15)" }}
                  _focusVisible={{ borderColor: "#6366F1", boxShadow: "none" }}
                />
              </InputGroup>
            )
          }
        >
          {loading ? (
            <Flex align="center" justify="center" py={8} gap={3}>
              <Spinner size="sm" />
              <Text fontSize="12px" color="rgba(255,255,255,0.3)">
                Loading actions...
              </Text>
            </Flex>
          ) : loadFailed ? (
            <Flex
              direction="column"
              align="center"
              gap={3}
              py={8}
              textAlign="center"
              border="1px dashed rgba(239,68,68,0.2)"
              borderRadius="8px"
            >
              <Text fontSize="13px" color="rgba(252,165,165,0.7)">
                Couldn't load your actions.
              </Text>
              <Button
                size="xs"
                leftIcon={<FiRefreshCw />}
                onClick={loadActions}
                variant="ghost"
                color="rgba(255,255,255,0.5)"
                _hover={{ color: "#A5B4FC", bg: "rgba(99,102,241,0.1)" }}
              >
                Try again
              </Button>
            </Flex>
          ) : actions.length === 0 ? (
            <Box
              py={8}
              textAlign="center"
              border="1px dashed rgba(255,255,255,0.08)"
              borderRadius="8px"
            >
              <Text fontSize="13px" color="rgba(255,255,255,0.3)">
                No saved actions yet.
              </Text>
            </Box>
          ) : filteredActions.length === 0 ? (
            <Box
              py={8}
              textAlign="center"
              border="1px dashed rgba(255,255,255,0.08)"
              borderRadius="8px"
            >
              <Text fontSize="13px" color="rgba(255,255,255,0.3)">
                No actions match "{search}".
              </Text>
            </Box>
          ) : (
            <Flex direction="column" gap={2}>
              {filteredActions.map((action) => (
                <ActionRow
                  key={action._id}
                  action={action}
                  serverName={getServerName(action.serverId)}
                  output={outputs[action._id]}
                  isRunning={runningIds.has(action._id)}
                  isDeleting={deletingIds.has(action._id)}
                  onExecute={() => executeAction(action)}
                  onDelete={() => requestDelete(action)}
                  onClearOutput={() => clearOutput(action._id)}
                  onCopyCommand={() =>
                    copyToClipboard(action.command, toast, "Command copied")
                  }
                />
              ))}
            </Flex>
          )}
        </ActionSection>
      </Box>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={closeDeleteDialog}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent
            bg="#0F0F14"
            border="1px solid rgba(255,255,255,0.08)"
            color="rgba(255,255,255,0.85)"
          >
            <AlertDialogHeader fontSize="14px" fontWeight={600}>
              Delete "{pendingDelete?.name}"?
            </AlertDialogHeader>

            <AlertDialogBody fontSize="13px" color="rgba(255,255,255,0.5)">
              This can't be undone. The saved command and its last output will
              be removed.
            </AlertDialogBody>

            <AlertDialogFooter gap={2}>
              <Button
                ref={cancelDeleteRef}
                onClick={closeDeleteDialog}
                size="sm"
                variant="ghost"
                color="rgba(255,255,255,0.6)"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                size="sm"
                bg="rgba(239,68,68,0.15)"
                color="#FCA5A5"
                border="1px solid rgba(239,68,68,0.3)"
                _hover={{ bg: "rgba(239,68,68,0.25)" }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};


const ActionInput = (props) => (
  <Input
    size="sm"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.025)"
    _hover={{ borderColor: "rgba(255,255,255,0.15)" }}
    _focusVisible={{ borderColor: "#6366F1", boxShadow: "none" }}
    {...props}
  />
);

const ActionSelect = (props) => (
  <Select
    size="sm"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.025)"
    _hover={{ borderColor: "rgba(255,255,255,0.15)" }}
    _focusVisible={{ borderColor: "#6366F1", boxShadow: "none" }}
    {...props}
  />
);

export default Actions;
