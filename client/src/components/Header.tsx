import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";

const Header = () => {
  const showText = useBreakpointValue({
    base: false,
    md: true,
  });

  const handleLogout = async (): Promise<void> => {
    try {
      const res = await fetch("/apilogout", {
        method: "GET",
      });

      if (res.ok) {
        window.location.href = "/";
      }
    } catch (error: unknown) {
      console.error(error);
    }
  };

  return (
    <Flex
      as="header"
      align="center"
      px={4}
      h="44px"
      flexShrink={0}
      gap={3}
      bg="#151821"
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.065)"
      position="sticky"
      top={0}
      zIndex={100}
    >
      {/* Brand */}
      <Flex align="center" gap="9px">
        <Flex
          align="center"
          justify="center"
          w="22px"
          h="22px"
          flexShrink={0}
          borderRadius="6px"
          bg="rgba(129,140,248,0.11)"
          border="1px solid"
          borderColor="rgba(129,140,248,0.2)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="1" fill="#A5B4FC" />

            <rect
              x="7"
              y="1"
              width="4"
              height="4"
              rx="1"
              fill="#A5B4FC"
              fillOpacity="0.4"
            />

            <rect
              x="1"
              y="7"
              width="4"
              height="4"
              rx="1"
              fill="#A5B4FC"
              fillOpacity="0.4"
            />

            <rect x="7" y="7" width="4" height="4" rx="1" fill="#A5B4FC" />
          </svg>
        </Flex>

        {showText && (
          <Text
            fontSize="13px"
            fontWeight={700}
            letterSpacing="-0.025em"
            color="rgba(255,255,255,0.84)"
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
        px="10px"
        h="30px"
        borderRadius="7px"
        border="1px solid"
        borderColor="rgba(255,255,255,0.08)"
        bg="rgba(255,255,255,0.02)"
        cursor="pointer"
        color="rgba(255,255,255,0.42)"
        transition="background 120ms ease, border-color 120ms ease, color 120ms ease"
        onClick={() => void handleLogout()}
        _hover={{
          bg: "rgba(229,115,115,0.07)",
          borderColor: "rgba(229,115,115,0.2)",
          color: "#E57373",
        }}
      >
        <FiLogOut size={12} />

        {showText && (
          <Text fontSize="11px" fontWeight={500}>
            Logout
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

export default Header;
