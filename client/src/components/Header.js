import {
  Flex,
  Text,
  Box,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { FiLogOut, FiMenu } from "react-icons/fi";
import DarkModeToggle from "./DarkModeToggle";

const Header = () => {
  const showText = useBreakpointValue({ base: false, md: true });

  const handleLogout = async () => {
    try {
      const res = await fetch("/apilogout", { method: "GET" });
      if (res.ok) window.location.href = "/";
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Flex
      as="header"
      align="center"
      px={5}
      h="52px"
      bg="rgba(15, 17, 23, 0.95)"
      backdropFilter="blur(12px)"
      borderBottom="1px solid rgba(255,255,255,0.07)"
      position="sticky"
      top={0}
      zIndex={100}
      gap={3}
    >
      {/* Logo mark */}
      <Flex align="center" gap={2} mr={4}>
        <Box
          w="22px"
          h="22px"
          borderRadius="5px"
          bg="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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
        {showText && (
          <Text
            fontSize="13px"
            fontWeight="700"
            letterSpacing="-0.02em"
            color="rgba(255,255,255,0.9)"
            fontFamily="'JetBrains Mono', monospace"
          >
            uploady
          </Text>
        )}
      </Flex>

      {/* Vertical rule */}
      <Box
        w="1px"
        h="20px"
        bg="rgba(255,255,255,0.08)"
        mr={2}
        display={{ base: "none", md: "block" }}
      />

      <Box flex={1} />

      <DarkModeToggle />

      {/* Logout */}
      <Flex
        align="center"
        gap={2}
        px={3}
        h="32px"
        borderRadius="6px"
        border="1px solid rgba(255,255,255,0.09)"
        cursor="pointer"
        transition="all 0.15s"
        color="rgba(255,255,255,0.45)"
        _hover={{
          bg: "rgba(239,68,68,0.1)",
          borderColor: "rgba(239,68,68,0.3)",
          color: "#EF4444",
        }}
        onClick={handleLogout}
      >
        <FiLogOut size={14} />
        {showText && (
          <Text fontSize="12px" fontWeight={500} letterSpacing="0.02em">
            Logout
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

export default Header;
