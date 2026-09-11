
import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";

const ActionButton = ({
  onClick,
  danger = false,
  disabled = false,
  children,
}) => (
  <Flex
    align="center"
    gap={2}
    px={3}
    h="30px"
    borderRadius="7px"
    border="1px solid"
    borderColor="rgba(255,255,255,0.085)"
    bg="rgba(255,255,255,0.025)"
    cursor={disabled ? "not-allowed" : "pointer"}
    color={disabled ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.5)"}
    opacity={disabled ? 0.6 : 1}
    transition="
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease
    "
    onClick={disabled ? undefined : onClick}
    userSelect="none"
    _hover={
      disabled
        ? {}
        : danger
          ? {
              bg: "rgba(229,115,115,0.08)",
              borderColor: "rgba(229,115,115,0.22)",
              color: "#E57373",
            }
          : {
              bg: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.82)",
            }
    }
  >
    {children}
  </Flex>
);

export default ActionButton