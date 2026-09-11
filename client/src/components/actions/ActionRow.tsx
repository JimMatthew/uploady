import { useState } from "react";

import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Spacer,
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react";

import {
  FiCopy,
  FiMaximize2,
  FiMinimize2,
  FiPlay,
  FiTerminal,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { ActionOutput, SavedAction } from "../../types/action";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ActionRowProps {
  action: SavedAction;

  serverName: string;

  output?: ActionOutput | null;

  isRunning: boolean;
  isDeleting: boolean;

  onExecute: () => void | Promise<void>;

  onDelete: () => void | Promise<void>;

  onClearOutput: () => void;

  onCopyCommand: () => void | Promise<void>;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error: unknown) {
    console.error("Failed to copy to clipboard:", error);
  }
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ActionRow = ({
  action,
  serverName,
  output,
  isRunning,
  isDeleting,
  onExecute,
  onDelete,
  onClearOutput,
  onCopyCommand,
}: ActionRowProps) => {
  const [outputExpanded, setOutputExpanded] = useState(false);

  return (
    <Box
      px={4}
      py={3}
      border="1px solid rgba(255,255,255,0.06)"
      borderRadius="8px"
      bg="rgba(0,0,0,0.12)"
      opacity={isDeleting ? 0.5 : 1}
      transition="opacity 0.15s"
    >
      <Flex
        align={{
          base: "stretch",
          md: "center",
        }}
        justify="space-between"
        direction={{
          base: "column",
          md: "row",
        }}
        gap={3}
      >
        <Box minW={0} flex={1}>
          <Flex align="center" gap={2}>
            <Text
              fontSize="13px"
              fontWeight={600}
              color="rgba(255,255,255,0.8)"
            >
              {action.name}
            </Text>

            <Badge
              bg={
                action.mode === "terminal"
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(99,102,241,0.1)"
              }
              color={action.mode === "terminal" ? "#86EFAC" : "#A5B4FC"}
              border="1px solid"
              borderColor={
                action.mode === "terminal"
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(99,102,241,0.2)"
              }
              fontSize="9px"
              fontWeight={500}
              textTransform="uppercase"
            >
              {action.mode}
            </Badge>
          </Flex>

          {action.description && (
            <Text mt={1} fontSize="11px" color="rgba(255,255,255,0.35)">
              {action.description}
            </Text>
          )}

          <Flex mt={2} align="center" gap={2} color="rgba(255,255,255,0.25)">
            <Icon as={FiTerminal} boxSize="11px" flexShrink={0} />

            <Text fontSize="10px" whiteSpace="nowrap">
              {serverName}
            </Text>

            <Text
              fontSize="10px"
              fontFamily="'JetBrains Mono', monospace"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {action.command}
            </Text>

            <Tooltip label="Copy command" fontSize="11px">
              <Box
                as="button"
                type="button"
                onClick={() => {
                  void onCopyCommand();
                }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                w="18px"
                h="18px"
                borderRadius="4px"
                color="rgba(255,255,255,0.25)"
                _hover={{
                  color: "#A5B4FC",
                  bg: "rgba(99,102,241,0.1)",
                }}
                aria-label="Copy command"
              >
                <Icon as={FiCopy} boxSize="10px" />
              </Box>
            </Tooltip>
          </Flex>
        </Box>

        <Flex gap={2} flexShrink={0}>
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<FiPlay />}
            onClick={() => {
              void onExecute();
            }}
            isLoading={isRunning}
            isDisabled={isDeleting}
            color="rgba(255,255,255,0.5)"
            _hover={{
              color: "#A5B4FC",
              bg: "rgba(99,102,241,0.1)",
            }}
          >
            Execute
          </Button>

          <IconButton
            size="xs"
            variant="ghost"
            icon={isDeleting ? <Spinner size="xs" /> : <FiTrash2 />}
            onClick={() => {
              void onDelete();
            }}
            isDisabled={isDeleting}
            aria-label="Delete action"
            color="rgba(255,255,255,0.4)"
            _hover={{
              color: "#FCA5A5",
              bg: "rgba(239,68,68,0.08)",
            }}
          />
        </Flex>
      </Flex>

      {output && (
        <Box mt={3} pt={3} borderTop="1px solid rgba(255,255,255,0.05)">
          <Flex align="center" mb={2} gap={2}>
            <Text
              fontSize="10px"
              fontWeight={600}
              color="rgba(255,255,255,0.35)"
              textTransform="uppercase"
            >
              Output
            </Text>

            <Spacer />

            <Text
              fontSize="10px"
              color={
                output.exitCode === 0
                  ? "rgba(134,239,172,0.6)"
                  : "rgba(252,165,165,0.7)"
              }
            >
              Exit {output.exitCode}
            </Text>

            <Tooltip label="Copy output" fontSize="11px">
              <Box
                as="button"
                type="button"
                onClick={() => {
                  void copyToClipboard(
                    [output.stdout, output.stderr].filter(Boolean).join("\n"),
                  );
                }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="22px"
                h="22px"
                borderRadius="5px"
                color="rgba(255,255,255,0.35)"
                _hover={{
                  color: "#A5B4FC",
                  bg: "rgba(99,102,241,0.1)",
                }}
                aria-label="Copy output"
              >
                <Icon as={FiCopy} boxSize="11px" />
              </Box>
            </Tooltip>

            <Box
              as="button"
              type="button"
              onClick={() => setOutputExpanded((previous) => !previous)}
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="22px"
              h="22px"
              borderRadius="5px"
              color="rgba(255,255,255,0.35)"
              _hover={{
                color: "#A5B4FC",
                bg: "rgba(99,102,241,0.1)",
              }}
              aria-label={outputExpanded ? "Collapse output" : "Expand output"}
              title={outputExpanded ? "Collapse output" : "Expand output"}
            >
              <Icon
                as={outputExpanded ? FiMinimize2 : FiMaximize2}
                boxSize="11px"
              />
            </Box>

            <Tooltip label="Hide output" fontSize="11px">
              <Box
                as="button"
                type="button"
                onClick={onClearOutput}
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="22px"
                h="22px"
                borderRadius="5px"
                color="rgba(255,255,255,0.35)"
                _hover={{
                  color: "#FCA5A5",
                  bg: "rgba(239,68,68,0.08)",
                }}
                aria-label="Hide output"
              >
                <Icon as={FiX} boxSize="12px" />
              </Box>
            </Tooltip>
          </Flex>

          {output.stdout && (
            <Box
              as="pre"
              m={0}
              p={3}
              maxH={outputExpanded ? "650px" : "300px"}
              overflow="auto"
              borderRadius="6px"
              bg="rgba(0,0,0,0.25)"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11px"
              lineHeight="1.5"
              color="rgba(255,255,255,0.65)"
              whiteSpace="pre-wrap"
              transition="max-height 0.2s ease"
            >
              {output.stdout}
            </Box>
          )}

          {output.stderr && (
            <Box
              as="pre"
              mt={output.stdout ? 2 : 0}
              mb={0}
              p={3}
              maxH="300px"
              overflow="auto"
              borderRadius="6px"
              bg="rgba(239,68,68,0.04)"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11px"
              lineHeight="1.5"
              color="rgba(252,165,165,0.7)"
              whiteSpace="pre-wrap"
            >
              {output.stderr}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ActionRow;
