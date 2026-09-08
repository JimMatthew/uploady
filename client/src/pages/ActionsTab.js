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
  Button,
  Spinner,
  Icon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  useDisclosure,
} from "@chakra-ui/react";

import { FiPlus, FiZap, FiSearch, FiRefreshCw } from "react-icons/fi";
import apiClient from "../services/apiClient";
import ActionCreateForm from "../components/actions/ActionCreateForm";
import ActionRow from "../components/actions/ActionRow";
import ActionSection from "../components/actions/ActionSection";

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningIds, setRunningIds] = useState(() => new Set());
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [newAction, setNewAction] = useState(emptyAction);
  const [outputs, setOutputs] = useState({});
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const {
    isOpen: isDeleteOpen,
    onOpen: openDeleteDialog,
    onClose: closeDeleteDialog,
  } = useDisclosure();

  const cancelDeleteRef = useRef(null);
  const [newActionOpen, setNewActionOpen] = useState(() => {
    const saved = localStorage.getItem("uploady.actions.newActionOpen");

    if (saved === null) {
      return true;
    }

    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(
      "uploady.actions.newActionOpen",
      String(newActionOpen),
    );
  }, [newActionOpen]);
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

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const requestDelete = (action) => {
    setPendingDelete(action);
    openDeleteDialog();
  };

  const confirmDelete = async () => {
    const action = pendingDelete;

    if (!action) {
      return;
    }

    closeDeleteDialog();

    setDeletingIds((prev) => new Set(prev).add(action._id));

    try {
      await apiClient.delete(`/api/actions/${action._id}`);

      setActions((prev) => prev.filter((item) => item._id !== action._id));

      clearOutput(action._id);

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

        openSsh(server, {
          initialCommand: result.command,
        });

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

  // ---------------------------------------------------------------------------
  // Helpers / filtering
  // ---------------------------------------------------------------------------

  const getServerName = (serverId) => {
    const server = serverList.find((item) => item._id === serverId);

    if (!server) {
      return "Unknown server";
    }

    return server.name || server.host || server.hostname || "Unknown server";
  };

  const filteredActions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return actions;
    }

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

        <ActionSection
          icon={FiPlus}
          title="New Action"
          description="Create a reusable command for one of your servers."
          collapsible
          isOpen={newActionOpen}
          onToggle={() => setNewActionOpen((prev) => !prev)}
        >
          <ActionCreateForm
            action={newAction}
            setAction={setNewAction}
            serverList={serverList}
            creating={creating}
            onCreate={createAction}
          />
        </ActionSection>

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
            <Flex direction="column" align="center" gap={3} py={8}>
              <Text fontSize="13px" color="rgba(252,165,165,0.7)">
                Couldn't load your actions.
              </Text>

              <Button
                size="xs"
                leftIcon={<FiRefreshCw />}
                onClick={loadActions}
                variant="ghost"
              >
                Try again
              </Button>
            </Flex>
          ) : actions.length === 0 ? (
            <EmptyMessage>No saved actions yet.</EmptyMessage>
          ) : filteredActions.length === 0 ? (
            <EmptyMessage>No actions match "{search}".</EmptyMessage>
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
                  toast={toast}
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
              This can't be undone.
            </AlertDialogBody>

            <AlertDialogFooter gap={2}>
              <Button
                ref={cancelDeleteRef}
                onClick={closeDeleteDialog}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>

              <Button
                onClick={confirmDelete}
                size="sm"
                bg="rgba(239,68,68,0.15)"
                color="#FCA5A5"
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

const EmptyMessage = ({ children }) => (
  <Box
    py={8}
    textAlign="center"
    border="1px dashed rgba(255,255,255,0.08)"
    borderRadius="8px"
  >
    <Text fontSize="13px" color="rgba(255,255,255,0.3)">
      {children}
    </Text>
  </Box>
);

export default Actions;
