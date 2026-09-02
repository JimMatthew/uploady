import React, { useState } from "react";
import { Box, Flex, Text, Input, Icon } from "@chakra-ui/react";
import { FiUser, FiLock, FiLogIn, FiAlertCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import apiClient, {ApiError} from "../services/apiClient";
const inputStyles = {
  bg: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.85)",
  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",
  h: "40px",
  px: 3,
  _placeholder: { color: "rgba(255,255,255,0.2)" },
  _hover: { borderColor: "rgba(255,255,255,0.18)" },
  _focus: {
    borderColor: "#6366F1",
    boxShadow: "0 0 0 2px rgba(99,102,241,0.2)",
    bg: "rgba(99,102,241,0.05)",
    outline: "none",
  },
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();

  setLoading(true);
  setError("");

  try {
    const data = await apiClient.post("/apilogin", {
      username,
      password,
    });

    localStorage.setItem("token", data.token);
    navigate("/api/sftp");
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
      bg="gray.900"
      position="relative"
      overflow="hidden"
    >
      {/* Background glow */}
      <Box
        position="absolute"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        pointerEvents="none"
      />

      <Box w="100%" maxW="360px" px={4}>
        {/* Logo */}
        <Flex direction="column" align="center" mb={8} gap={3}>
          <Box
            w="44px"
            h="44px"
            borderRadius="12px"
            bg="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 0 24px rgba(99,102,241,0.35)"
          >
            <svg width="22" height="22" viewBox="0 0 12 12" fill="none">
              <rect
                x="1"
                y="1"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.9"
              />
              <rect
                x="7"
                y="1"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.5"
              />
              <rect
                x="1"
                y="7"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.5"
              />
              <rect
                x="7"
                y="7"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </Box>
          <Box textAlign="center">
            <Text
              fontSize="20px"
              fontWeight="800"
              color="rgba(255,255,255,0.9)"
              letterSpacing="-0.03em"
              fontFamily="'JetBrains Mono', monospace"
            >
              uploady
            </Text>
            <Text fontSize="12px" color="rgba(255,255,255,0.3)" mt="2px">
              Sign in to continue
            </Text>
          </Box>
        </Flex>

        {/* Form card */}
        <Box
          as="form"
          onSubmit={handleSubmit}
          p={6}
          bg="rgba(255,255,255,0.03)"
          border="1px solid rgba(255,255,255,0.08)"
          borderRadius="14px"
          display="flex"
          flexDirection="column"
          gap={4}
        >
          {/* Username */}
          <Box>
            <Text
              fontSize="11px"
              fontWeight="600"
              color="rgba(255,255,255,0.35)"
              letterSpacing="0.07em"
              textTransform="uppercase"
              mb="6px"
            >
              Username
            </Text>
            <Box position="relative">
              <Icon
                as={FiUser}
                position="absolute"
                left={3}
                top="50%"
                transform="translateY(-50%)"
                boxSize="13px"
                color="rgba(255,255,255,0.25)"
                pointerEvents="none"
                zIndex={1}
              />
              <Input
                {...inputStyles}
                pl={9}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                required
              />
            </Box>
          </Box>

          {/* Password */}
          <Box>
            <Text
              fontSize="11px"
              fontWeight="600"
              color="rgba(255,255,255,0.35)"
              letterSpacing="0.07em"
              textTransform="uppercase"
              mb="6px"
            >
              Password
            </Text>
            <Box position="relative">
              <Icon
                as={FiLock}
                position="absolute"
                left={3}
                top="50%"
                transform="translateY(-50%)"
                boxSize="13px"
                color="rgba(255,255,255,0.25)"
                pointerEvents="none"
                zIndex={1}
              />
              <Input
                {...inputStyles}
                type="password"
                pl={9}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Box>
          </Box>

          {/* Error */}
          {error && (
            <Flex
              align="center"
              gap={2}
              px={3}
              py="8px"
              bg="rgba(239,68,68,0.08)"
              border="1px solid rgba(239,68,68,0.2)"
              borderRadius="7px"
            >
              <Icon
                as={FiAlertCircle}
                boxSize="13px"
                color="#EF4444"
                flexShrink={0}
              />
              <Text fontSize="12px" color="rgba(239,68,68,0.9)">
                {error}
              </Text>
            </Flex>
          )}

          {/* Submit */}
          <Flex
            as="button"
            type="submit"
            mt={1}
            h="42px"
            align="center"
            justify="center"
            gap={2}
            borderRadius="9px"
            bg={loading ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.2)"}
            border="1px solid rgba(99,102,241,0.35)"
            color="#818CF8"
            cursor={loading ? "wait" : "pointer"}
            fontWeight={700}
            fontSize="13px"
            letterSpacing="-0.01em"
            transition="all 0.15s"
            _hover={{
              bg: "rgba(99,102,241,0.3)",
              borderColor: "rgba(99,102,241,0.5)",
            }}
          >
            {loading ? (
              <Box
                w="14px"
                h="14px"
                borderRadius="full"
                border="2px solid rgba(129,140,248,0.3)"
                borderTopColor="#818CF8"
                animation="spin 0.7s linear infinite"
              />
            ) : (
              <>
                <Icon as={FiLogIn} boxSize="14px" />
                Sign in
              </>
            )}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

export default Login;
