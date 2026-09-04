import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  Spinner,
  Icon,
} from "@chakra-ui/react";
import {
  FiKey,
  FiCopy,
  FiTrash2,
  FiPlus,
  FiClock,
  FiFileText,
} from "react-icons/fi";

import apiClient from "../services/apiClient";

const Settings = ({ toast }) => {
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  // ---------------------------------------------------------------------------
  // SSH keys
  // ---------------------------------------------------------------------------

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);

    try {
      const data = await apiClient.get("/api/keys/shared");
      setKeys(data);
    } catch (err) {
      console.error("Failed to load SSH keys:", err);

      toast?.({
        title: "Failed to load SSH keys",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoadingKeys(false);
    }
  }, [toast]);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);

    try {
      const data = await apiClient.get("/api/settings");

      setSessionTimeout(String(data.session.jwtLifetimeMinutes));
    } catch (err) {
      console.error("Failed to load settings:", err);

      toast?.({
        title: "Failed to load settings",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoadingSettings(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKeys();
    loadSettings();
  }, [loadKeys, loadSettings]);

  const generateKey = async () => {
    const name = keyName.trim();

    if (!name) {
      toast?.({
        title: "Key name required",
        status: "warning",
      });

      return;
    }

    setGenerating(true);

    try {
      await apiClient.post("/api/keys/generate", {
        name,
      });

      setKeyName("");
      await loadKeys();

      toast?.({
        title: "SSH key generated",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to generate SSH key:", err);

      toast?.({
        title: "Failed to generate SSH key",
        description: err.message,
        status: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (key) => {
    const confirmed = window.confirm(`Delete SSH key "${key.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/api/keys/${key.id}`);

      setKeys((prev) => prev.filter((item) => item.id !== key.id));

      toast?.({
        title: "SSH key deleted",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to delete SSH key:", err);

      toast?.({
        title: "Failed to delete SSH key",
        description: err.message,
        status: "error",
      });
    }
  };

  const copyPublicKey = async (key) => {
    if (!key.publicKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(key.publicKey);

      toast?.({
        title: "Public key copied",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to copy public key:", err);

      toast?.({
        title: "Failed to copy public key",
        status: "error",
      });
    }
  };

  const saveSessionSettings = async () => {
    const lifetime = Number(sessionTimeout);

    if (!Number.isFinite(lifetime) || lifetime <= 0) {
      toast?.({
        title: "Invalid session lifetime",
        description: "Session lifetime must be greater than 0 minutes.",
        status: "warning",
      });

      return;
    }

    setSavingSession(true);

    try {
      const data = await apiClient.patch("/api/settings/session", {
        jwtLifetimeMinutes: lifetime,
      });

      setSessionTimeout(String(data.session.jwtLifetimeMinutes));

      toast?.({
        title: "Session settings saved",
        status: "success",
      });
    } catch (err) {
      console.error("Failed to save session settings:", err);

      toast?.({
        title: "Failed to save session settings",
        description: err.message,
        status: "error",
      });
    } finally {
      setSavingSession(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box h="100%" overflowY="auto" px={{ base: 4, md: 8 }} py={6}>
      <Box maxW="900px" mx="auto">
        <Box mb={8}>
          <Text fontSize="20px" fontWeight={600} color="rgba(255,255,255,0.9)">
            Settings
          </Text>

          <Text mt={1} fontSize="13px" color="rgba(255,255,255,0.35)">
            Configure Uploady and manage shared resources.
          </Text>
        </Box>

        {/* SSH Keys */}
        <SettingsSection
          icon={FiKey}
          title="SSH Keys"
          description="Manage reusable SSH keys available to servers."
        >
          <Flex gap={2} mb={5} direction={{ base: "column", sm: "row" }}>
            <Input
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Key name"
              size="sm"
              maxW="320px"
              borderColor="rgba(255,255,255,0.08)"
              bg="rgba(255,255,255,0.025)"
              _hover={{
                borderColor: "rgba(255,255,255,0.15)",
              }}
              _focusVisible={{
                borderColor: "#6366F1",
                boxShadow: "none",
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  generateKey();
                }
              }}
            />

            <Button
              size="sm"
              leftIcon={<FiPlus />}
              onClick={generateKey}
              isLoading={generating}
              bg="rgba(99,102,241,0.15)"
              color="#A5B4FC"
              border="1px solid rgba(99,102,241,0.3)"
              _hover={{
                bg: "rgba(99,102,241,0.25)",
              }}
            >
              Generate Key
            </Button>
          </Flex>

          {loadingKeys ? (
            <Flex align="center" justify="center" py={8} gap={3}>
              <Spinner size="sm" />

              <Text fontSize="12px" color="rgba(255,255,255,0.3)">
                Loading keys...
              </Text>
            </Flex>
          ) : keys.length === 0 ? (
            <Box
              py={8}
              textAlign="center"
              border="1px dashed rgba(255,255,255,0.08)"
              borderRadius="8px"
            >
              <Text fontSize="13px" color="rgba(255,255,255,0.3)">
                No shared SSH keys.
              </Text>
            </Box>
          ) : (
            <Flex direction="column" gap={2}>
              {keys.map((key) => (
                <KeyRow
                  key={key.id}
                  sshKey={key}
                  onCopy={() => copyPublicKey(key)}
                  onDelete={() => deleteKey(key)}
                />
              ))}
            </Flex>
          )}
        </SettingsSection>

        {/* Session */}
        <SettingsSection
          icon={FiClock}
          title="Session"
          description="Authentication and session behavior."
        >
          {loadingSettings ? (
            <Flex align="center" gap={3} py={3}>
              <Spinner size="sm" />

              <Text fontSize="12px" color="rgba(255,255,255,0.3)">
                Loading session settings...
              </Text>
            </Flex>
          ) : (
            <Flex
              align={{ base: "stretch", sm: "center" }}
              justify="space-between"
              direction={{ base: "column", sm: "row" }}
              gap={4}
            >
              <Box>
                <Text fontSize="12px" color="rgba(255,255,255,0.55)">
                  Session lifetime
                </Text>

                <Text mt={1} fontSize="10px" color="rgba(255,255,255,0.25)">
                  Lifetime of newly issued login tokens.
                </Text>
              </Box>

              <Flex align="center" gap={2}>
                <Input
                  type="number"
                  min="1"
                  value={sessionTimeout}
                  onChange={(event) => setSessionTimeout(event.target.value)}
                  size="sm"
                  w="120px"
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

                <Text fontSize="11px" color="rgba(255,255,255,0.3)">
                  minutes
                </Text>

                <Button
                  size="sm"
                  onClick={saveSessionSettings}
                  isLoading={savingSession}
                  bg="rgba(99,102,241,0.15)"
                  color="#A5B4FC"
                  border="1px solid rgba(99,102,241,0.3)"
                  _hover={{
                    bg: "rgba(99,102,241,0.25)",
                  }}
                >
                  Save
                </Button>
              </Flex>
            </Flex>
          )}
        </SettingsSection>

        {/* Logging */}
        <SettingsSection
          icon={FiFileText}
          title="Logging"
          description="Backend diagnostic logging."
        >
          <FutureSetting title="Log level" value="Coming later" />

          <FutureSetting title="Log retention" value="Coming later" />
        </SettingsSection>
      </Box>
    </Box>
  );
};

const SettingsSection = ({ icon, title, description, children }) => {
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

const KeyRow = ({ sshKey, onCopy, onDelete }) => {
  return (
    <Flex
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      direction={{ base: "column", md: "row" }}
      gap={3}
      px={4}
      py={3}
      border="1px solid rgba(255,255,255,0.06)"
      borderRadius="8px"
      bg="rgba(0,0,0,0.12)"
    >
      <Box minW={0} flex={1}>
        <Text fontSize="13px" fontWeight={600} color="rgba(255,255,255,0.8)">
          {sshKey.name}
        </Text>

        <Text
          mt={1}
          fontSize="10px"
          fontFamily="'JetBrains Mono', monospace"
          color="rgba(255,255,255,0.3)"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {sshKey.publicKey || "Public key unavailable"}
        </Text>
      </Box>

      <Flex gap={2} flexShrink={0}>
        <Button
          size="xs"
          variant="ghost"
          leftIcon={<FiCopy />}
          onClick={onCopy}
          isDisabled={!sshKey.publicKey}
          color="rgba(255,255,255,0.5)"
          _hover={{
            color: "#A5B4FC",
            bg: "rgba(99,102,241,0.1)",
          }}
        >
          Copy
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
  );
};

const FutureSetting = ({ title, value }) => {
  return (
    <Flex
      align="center"
      justify="space-between"
      py={3}
      borderBottom="1px solid rgba(255,255,255,0.04)"
      _last={{
        borderBottom: "none",
      }}
    >
      <Text fontSize="12px" color="rgba(255,255,255,0.55)">
        {title}
      </Text>

      <Text fontSize="11px" color="rgba(255,255,255,0.25)">
        {value}
      </Text>
    </Flex>
  );
};

export default Settings;
