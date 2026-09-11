import type { ReactNode } from "react";
import type { TransferItemFilter } from "../../types/transfer";
import { Flex } from "@chakra-ui/react";

const mono = "'JetBrains Mono', monospace";

interface ActionButtonProps {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

interface FilterPillProps {
  label: string;
  value: TransferItemFilter;
  active: boolean;
  onClick: (value: TransferItemFilter) => void;
}

interface PageButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export const ActionButton = ({
  onClick,
  danger = false,
  disabled = false,
  children,
}: ActionButtonProps) => (
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

export const FilterPill = ({
  label,
  value,
  active,
  onClick,
}: FilterPillProps) => (
  <Flex
    align="center"
    px="10px"
    h="26px"
    borderRadius="6px"
    border="1px solid"
    borderColor={active ? "rgba(129,140,248,0.25)" : "rgba(255,255,255,0.07)"}
    bg={active ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.015)"}
    color={active ? "#A5B4FC" : "rgba(255,255,255,0.34)"}
    cursor="pointer"
    fontSize="10px"
    fontWeight={active ? 600 : 500}
    fontFamily={mono}
    transition="
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease
    "
    onClick={() => onClick(value)}
    userSelect="none"
    _hover={{
      bg: active ? "rgba(129,140,248,0.11)" : "rgba(255,255,255,0.035)",
      borderColor: active ? "rgba(129,140,248,0.34)" : "rgba(255,255,255,0.13)",
      color: active ? "#A5B4FC" : "rgba(255,255,255,0.62)",
    }}
  >
    {label}
  </Flex>
);

export const PageButton = ({
  onClick,
  disabled = false,
  children,
}: PageButtonProps) => (
  <Flex
    align="center"
    justify="center"
    w="28px"
    h="28px"
    borderRadius="6px"
    border="1px solid"
    borderColor="rgba(255,255,255,0.08)"
    bg="rgba(255,255,255,0.02)"
    cursor={disabled ? "not-allowed" : "pointer"}
    color={disabled ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.42)"}
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
        : {
            bg: "rgba(255,255,255,0.045)",
            borderColor: "rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.8)",
          }
    }
  >
    {children}
  </Flex>
);
