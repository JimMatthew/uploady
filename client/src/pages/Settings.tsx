import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";

import type { IconType } from "react-icons";

import {
  FiClock,
  FiCopy,
  FiFileText,
  FiKey,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";

import apiClient from "../services/apiClient";
import type { AppToast } from "../hooks/useAppToast";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SharedSshKey {
  id: string;
  name: string;
  publicKey?: string;
}

interface SessionSettings {
  jwtLifetimeMinutes: number;
}

interface SettingsResponse {
  session: SessionSettings;
}

interface SettingsProps {
  toast: AppToast;
}

interface SettingsSectionProps {
  icon: IconType;
  title: string;
  description: string;
  children: ReactNode;
}

interface SettingRowProps {
  title: string;
  description?: string;
  children: ReactNode;
}

interface SettingStatusProps {
  children: ReactNode;
}

interface KeyCreatorProps {
  keyName: string;
  generating: boolean;
  onChange: (value: string) => void;
  onGenerate: () => void | Promise<void>;
}

interface KeyListProps {
  keys: SharedSshKey[];

  onCopy: (key: SharedSshKey) => void | Promise<void>;

  onDelete: (key: SharedSshKey) => void | Promise<void>;
}

interface KeyRowProps {
  sshKey: SharedSshKey;
  showBorder: boolean;
  onCopy: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

interface LoadingStateProps {
  label: string;
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const getErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
};

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

const Settings = ({ toast }: SettingsProps) => {
  const [keys, setKeys] = useState<SharedSshKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSession, setSavingSession] = useState(false);

  // ---------------------------------------------------------------------------
  // SSH keys
  // ---------------------------------------------------------------------------

  const loadKeys = useCallback(async (): Promise<void> => {
    setLoadingKeys(true);

    try {
      const data = await apiClient.get<SharedSshKey[]>("/api/keys/shared");

      setKeys(data);
    } catch (error: unknown) {
      console.error("Failed to load SSH keys:", error);

      toast({
        title: "Failed to load SSH keys",
        description: getErrorMessage(error),
        status: "error",
      });
    } finally {
      setLoadingKeys(false);
    }
  }, [toast]);

  const generateKey = async (): Promise<void> => {
    const name = keyName.trim();

    if (!name) {
      toast({
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

      toast({
        title: "SSH key generated",
        status: "success",
      });
    } catch (error: unknown) {
      console.error("Failed to generate SSH key:", error);

      toast({
        title: "Failed to generate SSH key",
        description: getErrorMessage(error),
        status: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (key: SharedSshKey): Promise<void> => {
    const confirmed = window.confirm(`Delete SSH key "${key.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/api/keys/${key.id}`);

      setKeys((current) => current.filter((item) => item.id !== key.id));

      toast({
        title: "SSH key deleted",
        status: "success",
      });
    } catch (error: unknown) {
      console.error("Failed to delete SSH key:", error);

      toast({
        title: "Failed to delete SSH key",
        description: getErrorMessage(error),
        status: "error",
      });
    }
  };

  const copyPublicKey = async (key: SharedSshKey): Promise<void> => {
    if (!key.publicKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(key.publicKey);

      toast({
        title: "Public key copied",
        status: "success",
      });
    } catch (error: unknown) {
      console.error("Failed to copy public key:", error);

      toast({
        title: "Failed to copy public key",
        status: "error",
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Application settings
  // ---------------------------------------------------------------------------

  const loadSettings = useCallback(async (): Promise<void> => {
    setLoadingSettings(true);

    try {
      const data = await apiClient.get<SettingsResponse>("/api/settings");

      setSessionTimeout(String(data.session.jwtLifetimeMinutes));
    } catch (error: unknown) {
      console.error("Failed to load settings:", error);

      toast({
        title: "Failed to load settings",
        description: getErrorMessage(error),
        status: "error",
      });
    } finally {
      setLoadingSettings(false);
    }
  }, [toast]);

  const saveSessionSettings = async (): Promise<void> => {
    const lifetime = Number(sessionTimeout);

    if (!Number.isFinite(lifetime) || lifetime <= 0) {
      toast({
        title: "Invalid session lifetime",
        description: "Session lifetime must be greater than 0 minutes.",
        status: "warning",
      });

      return;
    }

    setSavingSession(true);

    try {
      const data = await apiClient.patch<SettingsResponse>(
        "/api/settings/session",
        {
          jwtLifetimeMinutes: lifetime,
        },
      );

      setSessionTimeout(String(data.session.jwtLifetimeMinutes));

      toast({
        title: "Session settings saved",
        status: "success",
      });
    } catch (error: unknown) {
      console.error("Failed to save session settings:", error);

      toast({
        title: "Failed to save session settings",
        description: getErrorMessage(error),
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
    void loadKeys();
    void loadSettings();
  }, [loadKeys, loadSettings]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box
      h="100%"
      overflowY="auto"
      px={{
        base: 4,
        md: 8,
      }}
      py={{
        base: 5,
        md: 7,
      }}
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
                  onClick={() => {
                    void saveSessionSettings();
                  }}
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

// -----------------------------------------------------------------------------
// Page header
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Settings section
// -----------------------------------------------------------------------------

const SettingsSection = ({
  icon,
  title,
  description,
  children,
}: SettingsSectionProps) => (
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

// -----------------------------------------------------------------------------
// Setting row
// -----------------------------------------------------------------------------

const SettingRow = ({ title, description, children }: SettingRowProps) => (
  <Flex
    align={{
      base: "stretch",
      sm: "center",
    }}
    justify="space-between"
    direction={{
      base: "column",
      sm: "row",
    }}
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

const SettingStatus = ({ children }: SettingStatusProps) => (
  <Text fontSize="11px" color="whiteAlpha.300">
    {children}
  </Text>
);

// -----------------------------------------------------------------------------
// Key creator
// -----------------------------------------------------------------------------

const KeyCreator = ({
  keyName,
  generating,
  onChange,
  onGenerate,
}: KeyCreatorProps) => (
  <Flex
    gap={2}
    mb={5}
    direction={{
      base: "column",
      sm: "row",
    }}
    align={{
      base: "stretch",
      sm: "center",
    }}
  >
    <Input
      value={keyName}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Key name"
      size="sm"
      maxW={{
        base: "100%",
        sm: "320px",
      }}
      {...inputStyles}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          void onGenerate();
        }
      }}
    />

    <Button
      size="sm"
      leftIcon={<FiPlus />}
      onClick={() => {
        void onGenerate();
      }}
      isLoading={generating}
      alignSelf={{
        base: "stretch",
        sm: "auto",
      }}
      {...primaryButtonStyles}
    >
      Generate Key
    </Button>
  </Flex>
);

// -----------------------------------------------------------------------------
// Key list
// -----------------------------------------------------------------------------

const KeyList = ({ keys, onCopy, onDelete }: KeyListProps) => (
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

// -----------------------------------------------------------------------------
// Key row
// -----------------------------------------------------------------------------

const KeyRow = ({ sshKey, showBorder, onCopy, onDelete }: KeyRowProps) => (
  <Flex
    align={{
      base: "stretch",
      md: "center",
    }}
    justify="space-between"
    direction={{
      base: "column",
      md: "row",
    }}
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
        onClick={() => {
          void onCopy();
        }}
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
        onClick={() => {
          void onDelete();
        }}
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

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

const LoadingState = ({ label }: LoadingStateProps) => (
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
