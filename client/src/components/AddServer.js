import React, { useState } from "react";
import {
  Box, VStack, Text, Input, Textarea,
  Select, Flex, Icon,
} from "@chakra-ui/react";
import { FiServer, FiUser, FiLock, FiKey, FiSave } from "react-icons/fi";

const Field = ({ label, required, children }) => (
  <Box w="100%">
    <Flex align="center" gap={1} mb="6px">
      <Text fontSize="11px" fontWeight="600" color="rgba(255,255,255,0.4)" letterSpacing="0.06em" textTransform="uppercase">
        {label}
      </Text>
      {required && <Text fontSize="10px" color="rgba(239,68,68,0.6)">*</Text>}
    </Flex>
    {children}
  </Box>
);

const inputStyles = {
  bg: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.85)",
  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",
  _placeholder: { color: "rgba(255,255,255,0.2)" },
  _hover: { borderColor: "rgba(255,255,255,0.18)" },
  _focus: { borderColor: "#6366F1", boxShadow: "0 0 0 2px rgba(99,102,241,0.2)", bg: "rgba(99,102,241,0.05)" },
};

const AddServer = ({ handleSaveServer }) => {
  const [form, setForm] = useState({
    host: "", username: "", authMethod: "password",
    password: "", privateKey: "", passphrase: "",
  });

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = (e) => {
    e.preventDefault();
    handleSaveServer(
      form.host, form.username,
      form.authMethod === "password" ? form.password : form.privateKey,
      form.authMethod, form.passphrase
    );
    setForm({ host: "", username: "", authMethod: "password", password: "", privateKey: "", passphrase: "" });
  };

  return (
    <Box maxW="420px" mx="auto" mt={8}>
      {/* Header */}
      <Flex align="center" gap={3} mb={6}>
        <Box
          w="36px" h="36px" borderRadius="9px"
          bg="rgba(99,102,241,0.15)" border="1px solid rgba(99,102,241,0.25)"
          display="flex" alignItems="center" justifyContent="center"
        >
          <FiServer color="#818CF8" size={16} />
        </Box>
        <Box>
          <Text fontSize="16px" fontWeight="700" color="rgba(255,255,255,0.9)" letterSpacing="-0.02em">
            Add Server
          </Text>
          <Text fontSize="12px" color="rgba(255,255,255,0.3)">
            Configure SFTP connection
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
        <Field label="Host" required>
          <Input name="host" placeholder="192.168.1.1 or hostname" value={form.host} onChange={set} {...inputStyles} />
        </Field>

        <Field label="Username" required>
          <Input name="username" placeholder="root" value={form.username} onChange={set} {...inputStyles} />
        </Field>

        <Field label="Auth Method" required>
          <Select
            name="authMethod"
            value={form.authMethod}
            onChange={set}
            {...inputStyles}
            sx={{ option: { bg: "#0D0D12", color: "rgba(255,255,255,0.85)" } }}
          >
            <option value="password">Password</option>
            <option value="key">SSH Key</option>
          </Select>
        </Field>

        {form.authMethod === "password" && (
          <Field label="Password" required>
            <Input name="password" type="password" placeholder="••••••••" value={form.password} onChange={set} {...inputStyles} />
          </Field>
        )}

        {form.authMethod === "key" && (
          <>
            <Field label="Private Key" required>
              <Textarea
                name="privateKey"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                value={form.privateKey}
                onChange={set}
                rows={7}
                resize="none"
                {...inputStyles}
                fontSize="11px"
              />
            </Field>
            <Field label="Passphrase">
              <Input name="passphrase" type="password" placeholder="Optional" value={form.passphrase} onChange={set} {...inputStyles} />
            </Field>
          </>
        )}

        {/* Submit */}
        <Flex
          as="button"
          type="submit"
          mt={2}
          h="40px"
          align="center"
          justify="center"
          gap={2}
          borderRadius="8px"
          bg="rgba(99,102,241,0.2)"
          border="1px solid rgba(99,102,241,0.35)"
          color="#818CF8"
          cursor="pointer"
          fontWeight={600}
          fontSize="13px"
          letterSpacing="-0.01em"
          transition="all 0.15s"
          _hover={{ bg: "rgba(99,102,241,0.3)", borderColor: "rgba(99,102,241,0.5)" }}
        >
          <FiSave size={14} />
          Save Server
        </Flex>
      </VStack>
    </Box>
  );
};

export default AddServer;