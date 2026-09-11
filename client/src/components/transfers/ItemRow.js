import { useState } from "react";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FiArrowRight, FiX, FiZap } from "react-icons/fi";

import {
  formatDuration,
  formatSize,
  getTransferStatus,
} from "../../utils/transferUtils";

const mono = "'JetBrains Mono', monospace";

/**
 * A single file processed as part of a transfer job.
 *
 * @typedef {Object} TransferItem
 * @property {string} filename - Display name of the transferred file.
 * @property {string} sourcePath - Full path to the source file.
 * @property {string} destinationPath - Full path to the destination file.
 * @property {string|null|undefined} sourceServer - Source server name or ID.
 *   Missing/empty values represent a local source.
 * @property {string} status - Current or final transfer status, such as
 *   "pending", "in_progress", "completed", "failed", or "skipped".
 * @property {number|null|undefined} size - File size in bytes.
 * @property {number|null|undefined} durationMs - Transfer duration in
 *   milliseconds when calculated by the backend.
 * @property {string|Date|null|undefined} startedAt - Time the transfer started.
 * @property {string|Date|null|undefined} completedAt - Time the transfer
 *   completed.
 * @property {number|null|undefined} speedMBs - Average transfer speed in MB/s.
 * @property {string|null|undefined} error - Error message when the transfer
 *   failed.
 */

/**
 * Returns the duration of a transfer item in milliseconds.
 *
 * Uses the backend-provided duration when available. Otherwise, derives the
 * duration from the item's start and completion timestamps.
 *
 * @param {TransferItem} item
 * @returns {number|null}
 */
const getItemDurationMs = (item) => {
  if (item.durationMs !== null && item.durationMs !== undefined) {
    return item.durationMs;
  }

  if (!item.startedAt || !item.completedAt) {
    return null;
  }

  return new Date(item.completedAt) - new Date(item.startedAt);
};

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
const ItemRow = ({ item }) => {
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
