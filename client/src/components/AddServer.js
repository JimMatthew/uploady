import React, { useState } from "react";
import {
  Box,
  VStack,
  Text,
  Input,
  Textarea,
  Select,
  Flex,
  Icon,
  Collapse,
} from "@chakra-ui/react";
import { FiServer, FiSave, FiAlertCircle } from "react-icons/fi";

// ─── Field wrapper ────────────────────────────────────────────────────────────

const Field = ({ label, required, error, children }) => (
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

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyles = (hasError) => ({
  bg: "rgba(255,255,255,0.04)",
  border: "1px solid",
  borderColor: hasError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.09)",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.85)",
  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",
  _placeholder: { color: "rgba(255,255,255,0.18)" },
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

// ─── Initial state ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  host: "",
  username: "",
  authMethod: "password",
  password: "",
  privateKey: "",
  passphrase: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

const AddServer = ({ handleSaveServer }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change once user has attempted a submit
    if (submitted) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.host.trim()) errs.host = "Host is required";
    if (!form.username.trim()) errs.username = "Username is required";
    if (form.authMethod === "password" && !form.password)
      errs.password = "Password is required";
    if (form.authMethod === "key" && !form.privateKey.trim())
      errs.privateKey = "Private key is required";
    return errs;
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    handleSaveServer(
      form.host.trim(),
      form.username.trim(),
      form.authMethod === "password" ? form.password : form.privateKey,
      form.authMethod,
      form.passphrase || null,
    );
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
              option: { bg: "#0D0D12", color: "rgba(255,255,255,0.85)" },
            }}
          >
            <option value="password">Password</option>
            <option value="key">SSH Key</option>
          </Select>
        </Field>

        {/* Password auth */}
        <Collapse in={form.authMethod === "password"} animateOpacity>
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
        </Collapse>

        {/* Key auth */}
        <Collapse in={form.authMethod === "key"} animateOpacity>
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
        </Collapse>

        {/* Submit */}
        <Flex
          as="button"
          type="submit"
          mt={1}
          h="40px"
          align="center"
          justify="center"
          gap={2}
          borderRadius="8px"
          bg="rgba(99,102,241,0.18)"
          border="1px solid rgba(99,102,241,0.32)"
          color="#818CF8"
          cursor="pointer"
          fontWeight={600}
          fontSize="13px"
          letterSpacing="-0.01em"
          transition="all 0.15s"
          _hover={{
            bg: "rgba(99,102,241,0.28)",
            borderColor: "rgba(99,102,241,0.5)",
            color: "#A5B4FC",
          }}
          _active={{
            bg: "rgba(99,102,241,0.35)",
          }}
        >
          <Icon as={FiSave} boxSize="13px" />
          Save Server
        </Flex>
      </VStack>
    </Box>
  );
};

export default AddServer;
