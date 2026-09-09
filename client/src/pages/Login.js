import React, { useState } from "react";
import { Box, Button, Flex, Icon, Input, Text } from "@chakra-ui/react";
import { FiAlertCircle, FiLock, FiLogIn, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import apiClient, { ApiError } from "../services/apiClient";

const BACKGROUND = "#151821";
const SURFACE = "#1B1F2A";

const ACCENT = "#818CF8";
const ACCENT_HOVER = "#A5B4FC";

const inputStyles = {
  h: "40px",
  px: 3,

  bg: "rgba(255,255,255,0.025)",
  border: "1px solid",
  borderColor: "whiteAlpha.100",
  borderRadius: "8px",

  color: "whiteAlpha.800",

  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",

  _placeholder: {
    color: "whiteAlpha.300",
  },

  _hover: {
    borderColor: "whiteAlpha.200",
  },

  _focusVisible: {
    borderColor: ACCENT,
    boxShadow: `0 0 0 1px ${ACCENT}`,
    bg: "rgba(129,140,248,0.035)",
  },
};

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiClient.post("/apilogin", {
        username,
        password,
      });

      localStorage.setItem("token", data.token);

      navigate("/sftp");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid username or password");
      } else {
        console.error("Login failed:", err);

        setError("Unable to connect to Uploady");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      position="relative"
      overflow="hidden"
      bg={BACKGROUND}
    >
      {/* Subtle background accent */}

      <Box
        position="absolute"
        top="50%"
        left="50%"
        w="560px"
        h="560px"
        transform="translate(-50%, -55%)"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.045) 38%, transparent 72%)"
        pointerEvents="none"
      />

      <Box position="relative" w="100%" maxW="360px" px={4}>
        <LoginHeader />

        <Box
          as="form"
          onSubmit={handleSubmit}
          p={6}
          bg={SURFACE}
          border="1px solid"
          borderColor="rgba(255,255,255,0.09)"
          borderRadius="12px"
          boxShadow="0 18px 50px rgba(0,0,0,0.18)"
          display="flex"
          flexDirection="column"
          gap={4}
        >
          <LoginField label="Username" icon={FiUser}>
            <Input
              {...inputStyles}
              pl={9}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username"
              autoComplete="username"
              autoFocus
              required
            />
          </LoginField>

          <LoginField label="Password" icon={FiLock}>
            <Input
              {...inputStyles}
              type="password"
              pl={9}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </LoginField>

          {error && <LoginError>{error}</LoginError>}

          <Button
            type="submit"
            mt={1}
            h="42px"
            isLoading={loading}
            loadingText="Signing in"
            leftIcon={<FiLogIn />}
            bg="rgba(99,102,241,0.16)"
            border="1px solid"
            borderColor="rgba(129,140,248,0.30)"
            borderRadius="8px"
            color={ACCENT_HOVER}
            fontWeight={600}
            fontSize="13px"
            letterSpacing="-0.01em"
            transition="background 120ms ease, border-color 120ms ease, color 120ms ease"
            _hover={{
              bg: "rgba(99,102,241,0.24)",
              borderColor: "rgba(129,140,248,0.45)",
              color: "#C7D2FE",
            }}
            _active={{
              bg: "rgba(99,102,241,0.3)",
            }}
            _disabled={{
              opacity: 0.65,
              cursor: "wait",
            }}
          >
            Sign in
          </Button>
        </Box>
      </Box>
    </Flex>
  );
};

const LoginHeader = () => (
  <Flex direction="column" align="center" mb={8} gap={3}>
    <Flex
      w="44px"
      h="44px"
      align="center"
      justify="center"
      borderRadius="11px"
      bg="linear-gradient(135deg, #6366F1 0%, #7C6EE6 100%)"
      border="1px solid rgba(165,180,252,0.18)"
      boxShadow="0 8px 30px rgba(99,102,241,0.18)"
    >
      <UploadyMark />
    </Flex>

    <Box textAlign="center">
      <Text
        fontSize="20px"
        fontWeight={700}
        color="whiteAlpha.900"
        letterSpacing="-0.03em"
        fontFamily="'JetBrains Mono', monospace"
      >
        uploady
      </Text>

      <Text mt="2px" fontSize="12px" color="whiteAlpha.400">
        Sign in to continue
      </Text>
    </Box>
  </Flex>
);

const LoginField = ({ label, icon, children }) => (
  <Box>
    <Text
      mb="6px"
      fontSize="10px"
      fontWeight={600}
      color="whiteAlpha.400"
      letterSpacing="0.07em"
      textTransform="uppercase"
    >
      {label}
    </Text>

    <Box position="relative">
      <Icon
        as={icon}
        position="absolute"
        left={3}
        top="50%"
        transform="translateY(-50%)"
        boxSize="13px"
        color="whiteAlpha.300"
        pointerEvents="none"
        zIndex={1}
      />

      {children}
    </Box>
  </Box>
);

const LoginError = ({ children }) => (
  <Flex
    align="center"
    gap={2}
    px={3}
    py="8px"
    bg="rgba(229,115,115,0.07)"
    border="1px solid"
    borderColor="rgba(229,115,115,0.18)"
    borderRadius="7px"
  >
    <Icon as={FiAlertCircle} boxSize="13px" color="#E57373" flexShrink={0} />

    <Text fontSize="12px" color="#EF9A9A">
      {children}
    </Text>
  </Flex>
);

const UploadyMark = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="1"
      width="4"
      height="4"
      rx="1"
      fill="white"
      fillOpacity="0.92"
    />

    <rect
      x="7"
      y="1"
      width="4"
      height="4"
      rx="1"
      fill="white"
      fillOpacity="0.48"
    />

    <rect
      x="1"
      y="7"
      width="4"
      height="4"
      rx="1"
      fill="white"
      fillOpacity="0.48"
    />

    <rect
      x="7"
      y="7"
      width="4"
      height="4"
      rx="1"
      fill="white"
      fillOpacity="0.92"
    />
  </svg>
);

export default Login;
