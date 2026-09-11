import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  Tooltip,
  useBreakpointValue,
} from "@chakra-ui/react";

import type { IconType } from "react-icons";
import { FiCopy, FiShare2, FiTrash2, FiX } from "react-icons/fi";

interface ToolbarButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ToolbarProps {
  selected: Set<string>;
  copySelected: () => void;
  shareSelected: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
}

const ToolbarButton = ({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: ToolbarButtonProps) => (
  <Button
    size="xs"
    h="30px"
    px={3}
    leftIcon={<Icon as={icon} boxSize="11px" />}
    onClick={onClick}
    isDisabled={disabled}
    borderRadius="7px"
    bg={disabled ? "rgba(255,255,255,0.018)" : "rgba(255,255,255,0.055)"}
    border="1px solid"
    borderColor={
      disabled ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.11)"
    }
    color={disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)"}
    fontSize="11px"
    fontWeight={500}
    boxShadow={disabled ? "none" : "0 1px 2px rgba(0,0,0,0.15)"}
    transition="
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease
    "
    _hover={
      disabled
        ? {}
        : danger
          ? {
              bg: "rgba(229,115,115,0.1)",
              borderColor: "rgba(229,115,115,0.3)",
              color: "#E57373",
            }
          : {
              bg: "rgba(255,255,255,0.09)",
              borderColor: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.9)",
            }
    }
    _active={
      disabled
        ? {}
        : danger
          ? {
              bg: "rgba(229,115,115,0.14)",
            }
          : {
              bg: "rgba(255,255,255,0.12)",
            }
    }
  >
    {label}
  </Button>
);

const Toolbar = ({
  selected,
  copySelected,
  shareSelected,
  deleteSelected,
  clearSelection,
}: ToolbarProps) => {
  const isDesktop =
    useBreakpointValue({
      base: false,
      lg: true,
    }) ?? false;

  const hasSelection = selected.size > 0;

  return (
    <Flex
      align="center"
      gap="6px"
      px={{
        base: 3,
        md: 4,
      }}
      minH="46px"
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.06)"
      bg={hasSelection ? "rgba(99,102,241,0.045)" : "rgba(255,255,255,0.008)"}
      transition="background 140ms ease"
    >
      <ToolbarButton
        icon={FiCopy}
        label="Copy"
        onClick={copySelected}
        disabled={!hasSelection}
      />

      <ToolbarButton
        icon={FiShare2}
        label="Share"
        onClick={shareSelected}
        disabled={!hasSelection}
      />

      <ToolbarButton
        icon={FiTrash2}
        label="Delete"
        onClick={deleteSelected}
        disabled={!hasSelection}
        danger
      />

      <Box flex={1} />

      {hasSelection && (
        <Flex
          align="center"
          gap={2}
          pl={3}
          borderLeft="1px solid"
          borderColor="rgba(255,255,255,0.07)"
        >
          {isDesktop && (
            <Flex align="center" gap="6px">
              <Flex
                align="center"
                justify="center"
                minW="20px"
                h="20px"
                px="6px"
                borderRadius="6px"
                bg="rgba(99,102,241,0.1)"
                border="1px solid rgba(129,140,248,0.15)"
              >
                <Text
                  fontSize="10px"
                  lineHeight={1}
                  fontWeight={700}
                  color="#A5B4FC"
                >
                  {selected.size}
                </Text>
              </Flex>

              <Text
                fontSize="11px"
                fontWeight={500}
                color="rgba(255,255,255,0.42)"
              >
                {selected.size === 1 ? "item selected" : "items selected"}
              </Text>
            </Flex>
          )}

          <Tooltip label="Clear selection" hasArrow openDelay={400}>
            <Button
              size="xs"
              minW="28px"
              w="28px"
              h="28px"
              p={0}
              variant="ghost"
              borderRadius="7px"
              color="rgba(255,255,255,0.3)"
              onClick={clearSelection}
              aria-label="Clear selection"
              _hover={{
                bg: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <FiX size={11} />
            </Button>
          </Tooltip>
        </Flex>
      )}
    </Flex>
  );
};

export default Toolbar;
