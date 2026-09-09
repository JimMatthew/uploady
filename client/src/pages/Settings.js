import React, { useCallback, useEffect, useState } from "react";

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";

import {
  FiClock,
  FiCopy,
  FiFileText,
  FiKey,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";

import apiClient from "../services/apiClient";

const inputStyles = {
  borderColor: "whiteAlpha.100",
  bg: "whiteAlpha.50",
  color: "whiteAlpha.800",
  _placeholder: {
    color: "whiteAlpha.300",
  },
  _hover: {
    borderColor: "whiteAlpha.200",
  },
  _focusVisible: {
    borderColor: "#6366F1",
    boxShadow: "0 0 0 1px #6366F1",
  },
};

const primaryButtonStyles = {
  bg: "rgba(99,102,241,0.15)",
  color: "#A5B4FC",
  border: "1px solid rgba(99,102,241,0.3)",
  _hover: {
    bg: "rgba(99,102,241,0.25)",
  },
  _active: {
    bg: "rgba(99,102,241,0.32)",
  },
};

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

      setKeys((current) => current.filter((item) => item.id !== key.id));

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

  // ---------------------------------------------------------------------------
  // Application settings
  // ---------------------------------------------------------------------------

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
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadKeys();
    loadSettings();
  }, [loadKeys, loadSettings]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box
      h="100%"
      overflowY="auto"
      px={{ base: 4, md: 8 }}
      py={{ base: 5, md: 7 }}
    >
      <Box maxW="900px" mx="auto">
        <PageHeader />

        <SettingsSection
          icon={FiKey}
          title="SSH Keys"
          description="Reusable credentials for server authentication."
        >
          <KeyCreator
            keyName={keyName}
            generating={generating}
            onChange={setKeyName}
            onGenerate={generateKey}
          />

          {loadingKeys ? (
            <LoadingState label="Loading SSH keys..." />
          ) : keys.length === 0 ? (
            <EmptyKeyState />
          ) : (
            <KeyList keys={keys} onCopy={copyPublicKey} onDelete={deleteKey} />
          )}
        </SettingsSection>

        <SettingsSection
          icon={FiClock}
          title="Session"
          description="Authentication and session behavior."
        >
          {loadingSettings ? (
            <LoadingState label="Loading session settings..." />
          ) : (
            <SettingRow
              title="Session lifetime"
              description="Lifetime of newly issued login tokens."
            >
              <Flex align="center" gap={2}>
                <Input
                  type="number"
                  min="1"
                  value={sessionTimeout}
                  onChange={(event) => setSessionTimeout(event.target.value)}
                  size="sm"
                  w="90px"
                  {...inputStyles}
                />

                <Text fontSize="11px" color="whiteAlpha.400">
                  minutes
                </Text>

                <Button
                  size="sm"
                  onClick={saveSessionSettings}
                  isLoading={savingSession}
                  {...primaryButtonStyles}
                >
                  Save
                </Button>
              </Flex>
            </SettingRow>
          )}
        </SettingsSection>

        <SettingsSection
          icon={FiFileText}
          title="Logging"
          description="Backend diagnostic logging and retention."
        >
          <SettingRow title="Log level">
            <SettingStatus>Planned</SettingStatus>
          </SettingRow>

          <SettingDivider />

          <SettingRow title="Log retention">
            <SettingStatus>Planned</SettingStatus>
          </SettingRow>
        </SettingsSection>
      </Box>
    </Box>
  );
};

const PageHeader = () => (
  <Box mb={9}>
    <Text
      fontSize="20px"
      fontWeight={600}
      color="whiteAlpha.900"
      letterSpacing="-0.01em"
    >
      Settings
    </Text>

    <Text mt={1} fontSize="13px" color="whiteAlpha.400">
      Configure Uploady and manage shared resources.
    </Text>
  </Box>
);

const SettingsSection = ({ icon, title, description, children }) => (
  <Box mb={10}>
    <Flex align="center" gap={3} mb={4}>
      <Flex
        align="center"
        justify="center"
        w="30px"
        h="30px"
        flexShrink={0}
        borderRadius="7px"
        bg="rgba(99,102,241,0.1)"
        color="#818CF8"
      >
        <Icon as={icon} boxSize="14px" />
      </Flex>

      <Box minW={0}>
        <Text fontSize="13px" fontWeight={600} color="whiteAlpha.800">
          {title}
        </Text>

        <Text mt={0.5} fontSize="11px" color="whiteAlpha.400">
          {description}
        </Text>
      </Box>
    </Flex>

    <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={5}>
      {children}
    </Box>
  </Box>
);

const SettingRow = ({ title, description, children }) => (
  <Flex
    align={{ base: "stretch", sm: "center" }}
    justify="space-between"
    direction={{ base: "column", sm: "row" }}
    gap={5}
    py={3}
  >
    <Box minW={0}>
      <Text fontSize="12px" fontWeight={500} color="whiteAlpha.700">
        {title}
      </Text>

      {description && (
        <Text mt={1} fontSize="10px" color="whiteAlpha.300">
          {description}
        </Text>
      )}
    </Box>

    <Box flexShrink={0}>{children}</Box>
  </Flex>
);

const SettingDivider = () => (
  <Box borderTop="1px solid" borderColor="whiteAlpha.50" />
);

const SettingStatus = ({ children }) => (
  <Text fontSize="11px" color="whiteAlpha.300">
    {children}
  </Text>
);

const KeyCreator = ({ keyName, generating, onChange, onGenerate }) => (
  <Flex
    gap={2}
    mb={5}
    direction={{ base: "column", sm: "row" }}
    align={{ base: "stretch", sm: "center" }}
  >
    <Input
      value={keyName}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Key name"
      size="sm"
      maxW={{ base: "100%", sm: "320px" }}
      {...inputStyles}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onGenerate();
        }
      }}
    />

    <Button
      size="sm"
      leftIcon={<FiPlus />}
      onClick={onGenerate}
      isLoading={generating}
      alignSelf={{ base: "stretch", sm: "auto" }}
      {...primaryButtonStyles}
    >
      Generate Key
    </Button>
  </Flex>
);

const KeyList = ({ keys, onCopy, onDelete }) => (
  <Box
    border="1px solid"
    borderColor="whiteAlpha.100"
    borderRadius="8px"
    overflow="hidden"
  >
    {keys.map((key, index) => (
      <KeyRow
        key={key.id}
        sshKey={key}
        showBorder={index < keys.length - 1}
        onCopy={() => onCopy(key)}
        onDelete={() => onDelete(key)}
      />
    ))}
  </Box>
);

const KeyRow = ({ sshKey, showBorder, onCopy, onDelete }) => (
  <Flex
    align={{ base: "stretch", md: "center" }}
    justify="space-between"
    direction={{ base: "column", md: "row" }}
    gap={4}
    px={4}
    py={3}
    bg="rgba(255,255,255,0.012)"
    borderBottom={showBorder ? "1px solid" : "none"}
    borderColor="whiteAlpha.100"
    transition="background 120ms ease"
    _hover={{
      bg: "rgba(255,255,255,0.025)",
    }}
  >
    <Box minW={0} flex={1}>
      <Text fontSize="12px" fontWeight={600} color="whiteAlpha.800">
        {sshKey.name}
      </Text>

      <Text
        mt={1}
        fontSize="10px"
        fontFamily="'JetBrains Mono', monospace"
        color="whiteAlpha.400"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {sshKey.publicKey || "Public key unavailable"}
      </Text>
    </Box>

    <Flex gap={1} flexShrink={0}>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<FiCopy />}
        onClick={onCopy}
        isDisabled={!sshKey.publicKey}
        color="whiteAlpha.500"
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
        color="whiteAlpha.400"
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

const LoadingState = ({ label }) => (
  <Flex align="center" justify="center" gap={3} py={8}>
    <Spinner size="sm" thickness="2px" color="whiteAlpha.500" />

    <Text fontSize="12px" color="whiteAlpha.300">
      {label}
    </Text>
  </Flex>
);

const EmptyKeyState = () => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    py={9}
    border="1px dashed"
    borderColor="whiteAlpha.100"
    borderRadius="8px"
    bg="rgba(255,255,255,0.01)"
  >
    <Flex
      align="center"
      justify="center"
      w="36px"
      h="36px"
      mb={3}
      borderRadius="8px"
      bg="whiteAlpha.50"
      color="whiteAlpha.300"
    >
      <Icon as={FiKey} boxSize="15px" />
    </Flex>

    <Text fontSize="12px" fontWeight={500} color="whiteAlpha.500">
      No shared SSH keys
    </Text>

    <Text mt={1} fontSize="10px" color="whiteAlpha.300">
      Generate a key to reuse it across server configurations.
    </Text>
  </Flex>
);

export default Settings;
