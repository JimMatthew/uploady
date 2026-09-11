import { useState } from "react";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FiArrowRight, FiX, FiZap } from "react-icons/fi";

import {
  formatDuration,
  formatSize,
  getTransferStatus,
} from "../../utils/transferUtils";

const mono = "'JetBrains Mono', monospace";
import type { TransferItem } from "../../types/transfer";
/**
 * Returns the duration of a transfer item in milliseconds.
 *
 * Uses the backend-provided duration when available. Otherwise, derives the
 * duration from the item's start and completion timestamps.
 *
 * @param {TransferItem} item
 * @returns {number|null}
 */

const getItemDurationMs = (item: TransferItem): number | null => {
  if (item.durationMs !== null && item.durationMs !== undefined) {
    return item.durationMs;
  }

  if (!item.startedAt || !item.completedAt) {
    return null;
  }

  return (
    new Date(item.completedAt).getTime() -
    new Date(item.startedAt).getTime()
  );
};

interface ItemRowProps {
  item: TransferItem;
}
/**
 * Displays a single file from a transfer job.
 *
 * Shows the file's source and destination, size, duration, transfer speed,
 * and status. Failed items can be expanded to display their error message.
 *
 * @param {Object} props
 * @param {TransferItem} props.item - Transfer item to display.
 * @returns {import("react").JSX.Element}
 */
const ItemRow = ({ item }: ItemRowProps) => {
  const [expanded, setExpanded] = useState(false);

  const failed = item.status === "failed";
  const durationMs = getItemDurationMs(item);
  const statusConfig = getTransferStatus(item.status);

  return (
    <Box>
      <Flex
        align="center"
        gap={3}
        px={4}
        py="9px"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.04)"
        cursor={failed ? "pointer" : "default"}
        transition="background 120ms ease"
        onClick={() => {
          if (failed) {
            setExpanded((current) => !current);
          }
        }}
        _hover={
          failed
            ? {
                bg: "rgba(229,115,115,0.025)",
              }
            : {
                bg: "rgba(255,255,255,0.012)",
              }
        }
      >
        <Icon
          as={statusConfig.icon}
          boxSize="11px"
          color={statusConfig.color}
          flexShrink={0}
        />

        <Box flex={1} minW={0}>
          <Text
            fontSize="12px"
            fontWeight={500}
            fontFamily={mono}
            color={failed ? "rgba(229,115,115,0.88)" : "rgba(255,255,255,0.82)"}
            letterSpacing="-0.01em"
            noOfLines={1}
            mb="3px"
          >
            {item.filename}
          </Text>

          <Flex align="center" gap={2} minW={0}>
            <Text
              fontSize="10px"
              fontFamily={mono}
              color="rgba(255,255,255,0.38)"
              noOfLines={1}
            >
              {item.sourceServer || "local"}:{item.sourcePath}
            </Text>

            <Icon
              as={FiArrowRight}
              boxSize="8px"
              color="rgba(255,255,255,0.2)"
              flexShrink={0}
            />

            <Text
              fontSize="10px"
              fontFamily={mono}
              color="rgba(255,255,255,0.38)"
              noOfLines={1}
            >
              {item.destinationPath}
            </Text>
          </Flex>
        </Box>

        <Flex align="center" gap={4} flexShrink={0}>
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.42)"
            fontFamily={mono}
            minW="58px"
            textAlign="right"
          >
            {formatSize(item.size)}
          </Text>

          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.38)"
            fontFamily={mono}
            minW="50px"
            textAlign="right"
          >
            {formatDuration(durationMs)}
          </Text>

          {item.speedMBs ? (
            <Flex align="center" justify="flex-end" gap={1} minW="78px">
              <Icon as={FiZap} boxSize="9px" color="#A5B4FC" />

              <Text
                fontSize="10px"
                color="#A5B4FC"
                fontFamily={mono}
                fontWeight={500}
              >
                {item.speedMBs} MB/s
              </Text>
            </Flex>
          ) : (
            <Box minW="78px" />
          )}
        </Flex>
      </Flex>

      {expanded && item.error && (
        <Flex
          px={8}
          py={2}
          gap={2}
          align="flex-start"
          bg="rgba(229,115,115,0.045)"
          borderBottom="1px solid"
          borderColor="rgba(229,115,115,0.08)"
        >
          <Icon
            as={FiX}
            boxSize="10px"
            color="rgba(229,115,115,0.65)"
            mt="2px"
            flexShrink={0}
          />

          <Text
            fontSize="10px"
            fontFamily={mono}
            color="rgba(229,115,115,0.78)"
            lineHeight="1.6"
          >
            {item.error}
          </Text>
        </Flex>
      )}
    </Box>
  );
};

export default ItemRow;
