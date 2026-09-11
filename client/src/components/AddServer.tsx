import { useEffect, useState } from "react";

import type { ChangeEvent, FormEvent, ReactNode } from "react";

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";

import { FiAlertCircle, FiSave, FiServer } from "react-icons/fi";

import apiClient from "../services/apiClient";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type AuthMethod = "password" | "key";

type KeyMode = "saved" | "import" | "generate";

interface AddServerForm {
  host: string;
  username: string;
  authMethod: AuthMethod;
  keyMode: KeyMode;
  keyId: string;
  password: string;
  privateKey: string;
  passphrase: string;
}

type FormErrors = Partial<Record<keyof AddServerForm, string>>;

interface SharedKey {
  id: string;
  name: string;
}

interface GeneratedKey {
  host: string;
  username: string;
  publicKey: string;
}

interface SavedServer {
  id: string;
  host: string;
  username: string;
  authType: AuthMethod;
  keyId?: string;
  publicKey?: string;
}

export interface SaveServerResponse {
  message: string;
  server: SavedServer;
}

export interface PasswordServerPayload {
  host: string;
  username: string;
  authType: "password";
  password: string;
}

export interface SavedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "saved";
  keyId: string;
}

export interface ImportedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "import";
  key: string;
  passphrase?: string;
}

export interface GeneratedKeyServerPayload {
  host: string;
  username: string;
  authType: "key";
  keyMode: "generate";
}

export type SaveServerPayload =
  | PasswordServerPayload
  | SavedKeyServerPayload
  | ImportedKeyServerPayload
  | GeneratedKeyServerPayload;

interface AddServerProps {
  handleSaveServer: (
    payload: SaveServerPayload,
  ) => Promise<SaveServerResponse | null>;
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

// -----------------------------------------------------------------------------
// Field wrapper
// -----------------------------------------------------------------------------

const Field = ({ label, required = false, error, children }: FieldProps) => (
  <Box w="100%">
    <Flex align="center" gap={1} mb="6px">
      <Text
        fontSize="11px"
        fontWeight="600"
        color="rgba(255,255,255,0.4)"
        letterSpacing="0.06em"
        textTransform="uppercase"
      >
        {label}
      </Text>

      {required && (
        <Text fontSize="10px" color="rgba(239,68,68,0.5)">
          *
        </Text>
      )}
    </Flex>

    {children}

    {error && (
      <Flex align="center" gap={1} mt="5px">
        <Icon as={FiAlertCircle} boxSize="10px" color="rgba(239,68,68,0.7)" />

        <Text fontSize="11px" color="rgba(239,68,68,0.7)">
          {error}
        </Text>
      </Flex>
    )}
  </Box>
);

// -----------------------------------------------------------------------------
// Input styles
// -----------------------------------------------------------------------------

const inputStyles = (hasError: boolean) => ({
  bg: "rgba(255,255,255,0.04)",
  border: "1px solid",
  borderColor: hasError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.09)",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.85)",
  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",
  _placeholder: {
    color: "rgba(255,255,255,0.18)",
  },
  _hover: {
    borderColor: hasError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.18)",
  },
  _focus: {
    borderColor: hasError ? "#EF4444" : "#6366F1",
    boxShadow: hasError
      ? "0 0 0 2px rgba(239,68,68,0.15)"
      : "0 0 0 2px rgba(99,102,241,0.2)",
    bg: hasError ? "rgba(239,68,68,0.03)" : "rgba(99,102,241,0.05)",
  },
});

// -----------------------------------------------------------------------------
// Initial state
// -----------------------------------------------------------------------------

const EMPTY_FORM: AddServerForm = {
  host: "",
  username: "",
  authMethod: "password",
  keyMode: "import",
  keyId: "",
  password: "",
  privateKey: "",
  passphrase: "",
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const AddServer = ({ handleSaveServer }: AddServerProps) => {
  const [form, setForm] = useState<AddServerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [sharedKeys, setSharedKeys] = useState<SharedKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  useEffect(() => {
    const loadSharedKeys = async (): Promise<void> => {
      setLoadingKeys(true);

      try {
        const keys = await apiClient.get<SharedKey[]>("/api/keys/shared");

        setSharedKeys(keys);
      } catch (error: unknown) {
        console.error("Failed to load shared SSH keys:", error);
      } finally {
        setLoadingKeys(false);
      }
    };

    void loadSharedKeys();
  }, []);

  const set = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ): void => {
    const name = event.target.name as keyof AddServerForm;

    const { value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (submitted) {
      setErrors((previous) => ({
        ...previous,
        [name]: undefined,
      }));
    }
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};

    if (!form.host.trim()) {
      errs.host = "Host is required";
    }

    if (!form.username.trim()) {
      errs.username = "Username is required";
    }

    if (form.authMethod === "password" && !form.password) {
      errs.password = "Password is required";
    }

    if (
      form.authMethod === "key" &&
      form.keyMode === "import" &&
      !form.privateKey.trim()
    ) {
      errs.privateKey = "Private key is required";
    }

    if (form.authMethod === "key" && form.keyMode === "saved" && !form.keyId) {
      errs.keyId = "Select an SSH key";
    }

    return errs;
  };

  const handleSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    setSubmitted(true);

    const errs = validate();

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const host = form.host.trim();

    const username = form.username.trim();

    let payload: SaveServerPayload;

    if (form.authMethod === "password") {
      payload = {
        host,
        username,
        authType: "password",
        password: form.password,
      };
    } else if (form.keyMode === "saved") {
      payload = {
        host,
        username,
        authType: "key",
        keyMode: "saved",
        keyId: form.keyId,
      };
    } else if (form.keyMode === "import") {
      payload = {
        host,
        username,
        authType: "key",
        keyMode: "import",
        key: form.privateKey.trim(),
        ...(form.passphrase
          ? {
              passphrase: form.passphrase,
            }
          : {}),
      };
    } else {
      payload = {
        host,
        username,
        authType: "key",
        keyMode: "generate",
      };
    }

    const result = await handleSaveServer(payload);

    if (!result) {
      return;
    }

    if (
      payload.authType === "key" &&
      payload.keyMode === "generate" &&
      result.server.publicKey
    ) {
      setGeneratedKey({
        host,
        username,
        publicKey: result.server.publicKey,
      });
    } else {
      setGeneratedKey(null);
    }

    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
  };

  return (
    <Box maxW="560px" w="100%" mx="auto" px={6} pb={6}>
      {/* Header */}

      <Flex align="center" gap={3} mb={4} pt={4}>
        <Box
          w="36px"
          h="36px"
          borderRadius="9px"
          bg="rgba(99,102,241,0.15)"
          border="1px solid rgba(99,102,241,0.25)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <FiServer color="#818CF8" size={16} />
        </Box>

        <Box>
          <Text
            fontSize="16px"
            fontWeight={700}
            color="rgba(255,255,255,0.9)"
            letterSpacing="-0.02em"
            lineHeight={1.2}
          >
            Add Server
          </Text>

          <Text fontSize="12px" color="rgba(255,255,255,0.28)" mt="1px">
            Configure a new SFTP connection
          </Text>
        </Box>
      </Flex>

      <VStack
        as="form"
        onSubmit={handleSave}
        spacing={4}
        align="stretch"
        p={5}
        bg="rgba(255,255,255,0.02)"
        border="1px solid rgba(255,255,255,0.07)"
        borderRadius="12px"
      >
        <Field label="Host" required error={errors.host}>
          <Input
            name="host"
            placeholder="192.168.1.1 or hostname"
            value={form.host}
            onChange={set}
            {...inputStyles(!!errors.host)}
          />
        </Field>

        <Field label="Username" required error={errors.username}>
          <Input
            name="username"
            placeholder="root"
            value={form.username}
            onChange={set}
            {...inputStyles(!!errors.username)}
          />
        </Field>

        <Field label="Auth Method" required>
          <Select
            name="authMethod"
            value={form.authMethod}
            onChange={set}
            {...inputStyles(false)}
            sx={{
              option: {
                bg: "#0D0D12",
                color: "rgba(255,255,255,0.85)",
              },
            }}
          >
            <option value="password">Password</option>

            <option value="key">SSH Key</option>
          </Select>
        </Field>

        {/* Password auth */}

        {form.authMethod === "password" && (
          <Field label="Password" required error={errors.password}>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set}
              {...inputStyles(!!errors.password)}
            />
          </Field>
        )}

        {/* Key auth */}

        {form.authMethod === "key" && (
          <VStack spacing={4} align="stretch">
            <Field label="Key Mode" required>
              <Select
                name="keyMode"
                value={form.keyMode}
                onChange={set}
                {...inputStyles(false)}
                sx={{
                  option: {
                    bg: "#0D0D12",
                    color: "rgba(255,255,255,0.85)",
                  },
                }}
              >
                <option value="saved">Use Saved Key</option>

                <option value="import">Use Existing Key</option>

                <option value="generate">Generate New Key</option>
              </Select>
            </Field>

            {form.keyMode === "import" && (
              <VStack spacing={4} align="stretch">
                <Field label="Private Key" required error={errors.privateKey}>
                  <Textarea
                    name="privateKey"
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    value={form.privateKey}
                    onChange={set}
                    rows={7}
                    resize="none"
                    {...inputStyles(!!errors.privateKey)}
                    fontSize="11px"
                  />
                </Field>

                <Field label="Passphrase">
                  <Input
                    name="passphrase"
                    type="password"
                    placeholder="Optional"
                    value={form.passphrase}
                    onChange={set}
                    {...inputStyles(false)}
                  />
                </Field>
              </VStack>
            )}

            {form.keyMode === "saved" && (
              <Field label="Saved Key" required error={errors.keyId}>
                <Select
                  name="keyId"
                  value={form.keyId}
                  onChange={set}
                  {...inputStyles(!!errors.keyId)}
                  sx={{
                    option: {
                      bg: "#0D0D12",
                      color: "rgba(255,255,255,0.85)",
                    },
                  }}
                >
                  <option value="">
                    {loadingKeys ? "Loading keys..." : "Select SSH key"}
                  </option>

                  {sharedKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name}
                    </option>
                  ))}
                </Select>

                {!loadingKeys && sharedKeys.length === 0 && (
                  <Text mt={2} fontSize="11px" color="rgba(255,255,255,0.28)">
                    No shared SSH keys are available.
                  </Text>
                )}
              </Field>
            )}
          </VStack>
        )}

        {/* Submit */}

        <Button
          type="submit"
          mt={1}
          h="40px"
          borderRadius="8px"
          bg="rgba(99,102,241,0.18)"
          border="1px solid rgba(99,102,241,0.32)"
          color="#818CF8"
          fontWeight={600}
          fontSize="13px"
          letterSpacing="-0.01em"
          transition="all 0.15s"
          leftIcon={<Icon as={FiSave} boxSize="13px" />}
          _hover={{
            bg: "rgba(99,102,241,0.28)",
            borderColor: "rgba(99,102,241,0.5)",
            color: "#A5B4FC",
          }}
          _active={{
            bg: "rgba(99,102,241,0.35)",
          }}
        >
          Save Server
        </Button>
      </VStack>

      {generatedKey && <GeneratedKeyPanel generatedKey={generatedKey} />}
    </Box>
  );
};

// -----------------------------------------------------------------------------
// Generated key
// -----------------------------------------------------------------------------

interface GeneratedKeyPanelProps {
  generatedKey: GeneratedKey;
}

const GeneratedKeyPanel = ({ generatedKey }: GeneratedKeyPanelProps) => {
  const installCommand =
    `mkdir -p ~/.ssh && chmod 700 ~/.ssh && ` +
    `echo '${generatedKey.publicKey}' >> ~/.ssh/authorized_keys && ` +
    `chmod 600 ~/.ssh/authorized_keys`;

  const copyText = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <Box
      mt={4}
      p={5}
      bg="rgba(34,197,94,0.04)"
      border="1px solid rgba(34,197,94,0.18)"
      borderRadius="12px"
    >
      <Flex align="center" justify="space-between" mb={1}>
        <Text fontSize="13px" fontWeight={700} color="rgba(255,255,255,0.9)">
          SSH Key Generated
        </Text>

        <Text fontSize="11px" color="rgba(34,197,94,0.75)" fontWeight={600}>
          Server Saved
        </Text>
      </Flex>

      <Text fontSize="12px" color="rgba(255,255,255,0.45)" mb={5}>
        Install the public key for{" "}
        <Text
          as="span"
          color="rgba(255,255,255,0.7)"
          fontFamily="'JetBrains Mono', monospace"
        >
          {generatedKey.username}@{generatedKey.host}
        </Text>
      </Text>

      {/* Public key */}

      <Box mb={4}>
        <Flex align="center" justify="space-between" mb="6px">
          <Text
            fontSize="11px"
            fontWeight={600}
            color="rgba(255,255,255,0.4)"
            letterSpacing="0.06em"
            textTransform="uppercase"
          >
            Public Key
          </Text>

          <Button
            type="button"
            size="xs"
            h="28px"
            px={2}
            borderRadius="6px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.08)"
            color="rgba(255,255,255,0.6)"
            fontSize="11px"
            fontWeight={500}
            _hover={{
              bg: "rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.85)",
            }}
            onClick={() => {
              void copyText(generatedKey.publicKey);
            }}
          >
            Copy
          </Button>
        </Flex>

        <Textarea
          value={generatedKey.publicKey}
          readOnly
          rows={3}
          resize="none"
          {...inputStyles(false)}
          fontSize="11px"
        />
      </Box>

      {/* Install command */}

      <Box>
        <Flex align="center" justify="space-between" mb="6px">
          <Text
            fontSize="11px"
            fontWeight={600}
            color="rgba(255,255,255,0.4)"
            letterSpacing="0.06em"
            textTransform="uppercase"
          >
            Install Command
          </Text>

          <Button
            type="button"
            size="xs"
            h="28px"
            px={2}
            borderRadius="6px"
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.08)"
            color="rgba(255,255,255,0.6)"
            fontSize="11px"
            fontWeight={500}
            _hover={{
              bg: "rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.85)",
            }}
            onClick={() => {
              void copyText(installCommand);
            }}
          >
            Copy Command
          </Button>
        </Flex>

        <Textarea
          value={installCommand}
          readOnly
          rows={4}
          resize="none"
          {...inputStyles(false)}
          fontSize="11px"
        />

        <Text mt={2} fontSize="11px" color="rgba(255,255,255,0.28)">
          Run this while logged in as {generatedKey.username}.
        </Text>
      </Box>
    </Box>
  );
};

export default AddServer;
