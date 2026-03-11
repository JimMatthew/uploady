import { Flex, Text, Box, useBreakpointValue } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";

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
      px={4}
      h="44px"
      bg="gray.900"
      backdropFilter="blur(12px)"
      borderBottom="1px solid rgba(255,255,255,0.06)"
      position="sticky"
      top={0}
      zIndex={100}
      gap={3}
      flexShrink={0}
    >
      {/* Logo */}
      <Flex align="center" gap="10px">
        <Box
          w="22px"
          h="22px"
          borderRadius="5px"
          bg="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          boxShadow="0 0 10px rgba(99,102,241,0.35)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect
              x="1"
              y="1"
              width="4"
              height="4"
              rx="1"
              fill="white"
              fillOpacity="0.95"
            />
            <rect
              x="7"
              y="1"
              width="4"
              height="4"
              rx="1"
              fill="white"
              fillOpacity="0.45"
            />
            <rect
              x="1"
              y="7"
              width="4"
              height="4"
              rx="1"
              fill="white"
              fillOpacity="0.45"
            />
            <rect
              x="7"
              y="7"
              width="4"
              height="4"
              rx="1"
              fill="white"
              fillOpacity="0.95"
            />
          </svg>
        </Box>
        {showText && (
          <Text
            fontSize="13px"
            fontWeight="700"
            letterSpacing="-0.02em"
            color="rgba(255,255,255,0.85)"
            fontFamily="'JetBrains Mono', monospace"
          >
            uploady
          </Text>
        )}
      </Flex>

      <Box flex={1} />

      {/* Logout */}
      <Flex
        align="center"
        gap={2}
        px={3}
        h="30px"
        borderRadius="6px"
        border="1px solid rgba(255,255,255,0.08)"
        cursor="pointer"
        transition="all 0.15s"
        color="rgba(255,255,255,0.35)"
        _hover={{
          bg: "rgba(239,68,68,0.08)",
          borderColor: "rgba(239,68,68,0.25)",
          color: "#EF4444",
        }}
        onClick={handleLogout}
      >
        <FiLogOut size={13} />
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
