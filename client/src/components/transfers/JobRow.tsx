import type { MouseEventHandler } from "react";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FiArrowRight } from "react-icons/fi";
import type { TransferJob, TransferProgressMap, TransferRootProgress } from "../../types/transfer";
import {
  deriveJobStatus,
  formatDuration,
  formatSize,
  formatTime,
  getStatusBackground,
  getStatusBorder,
  getTransferStatus,
} from "../../utils/transferUtils";

const mono = "'JetBrains Mono', monospace";

interface JobRowProps {
  job: TransferJob;
  progressMap: TransferProgressMap;
  onClick: MouseEventHandler<HTMLDivElement>;
}

/**
 * Returns the current completion percentage for a live transfer root.
 *
 * Uses explicit byte/file progress when available. Otherwise, calculates
 * progress from the number of completed and failed items.
 */
const getRootPercent = (
  root: TransferRootProgress,
): number => {
  if (
    typeof root.progress === "number" &&
    root.progress > 0
  ) {
    return root.progress;
  }

  if (root.total > 0) {
    return Math.round(
      ((root.completed + root.failed) / root.total) *
        100,
    );
  }

  return 0;
};

/**
 * Displays a summary row for a transfer job.
 *
 * Live transfer progress is shown when progress data exists for the job.
 * Otherwise, persisted job counts are displayed.
 */
const JobRow = ({
  job,
  progressMap,
  onClick,
}: JobRowProps) => {
  const status = deriveJobStatus(job);
  const config = getTransferStatus(status);

  const liveRoots = Object.entries(progressMap)
    .filter(([key]) =>
      key.startsWith(`${job._id}-`),
    )
    .map(([, value]) => value);

  const hasLiveProgress = liveRoots.length > 0;

  const liveTotal = liveRoots.reduce(
    (sum, root) => sum + (root.total ?? 0),
    0,
  );

  const liveCompleted = liveRoots.reduce(
    (sum, root) => sum + (root.completed ?? 0),
    0,
  );

  const liveFailed = liveRoots.reduce(
    (sum, root) => sum + (root.failed ?? 0),
    0,
  );

  const livePercent =
    liveRoots.length > 0
      ? Math.round(
          liveRoots.reduce(
            (sum, root) =>
              sum + getRootPercent(root),
            0,
          ) / liveRoots.length,
        )
      : 0;

  return (
    <Flex
      align="center"
      gap={3}
      px={4}
      py="11px"
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.045)"
      cursor="pointer"
      transition="background 120ms ease"
      onClick={onClick}
      _hover={{
        bg: "rgba(255,255,255,0.025)",
      }}
    >
      <Flex
        align="center"
        justify="center"
        w="24px"
        h="24px"
        borderRadius="6px"
        flexShrink={0}
        bg={getStatusBackground(status)}
        border="1px solid"
        borderColor={getStatusBorder(status)}
      >
        <Icon
          as={config.icon}
          boxSize="10px"
          color={config.color}
        />
      </Flex>

      <Box flex={1} minW={0}>
        <Flex
          align="center"
          gap={2}
          mb="3px"
          minW={0}
        >
          <Text
            fontSize="11px"
            fontWeight={600}
            fontFamily={mono}
            color="rgba(255,255,255,0.72)"
            letterSpacing="-0.01em"
            flexShrink={0}
          >
            {job.sourceServers?.join(", ") ||
              "local"}
          </Text>

          <Icon
            as={FiArrowRight}
            boxSize="9px"
            color="rgba(255,255,255,0.2)"
            flexShrink={0}
          />

          <Text
            fontSize="11px"
            fontWeight={600}
            fontFamily={mono}
            color="rgba(255,255,255,0.72)"
            letterSpacing="-0.01em"
            flexShrink={0}
          >
            {job.destServer}
          </Text>

          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.3)"
            fontFamily={mono}
            noOfLines={1}
            minW={0}
          >
            {job.destPath}
          </Text>
        </Flex>

        <Flex align="center" gap={3}>
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.38)"
            fontFamily={mono}
          >
            {formatTime(job.createdAt)}
          </Text>

          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.3)"
            fontFamily={mono}
          >
            {formatDuration(job.durationMs)}
          </Text>

          {job.totalBytes > 0 && (
            <Text
              fontSize="10px"
              color="rgba(255,255,255,0.3)"
              fontFamily={mono}
            >
              {formatSize(job.totalBytes)}
            </Text>
          )}
        </Flex>
      </Box>

      <Flex
        direction="column"
        align="flex-end"
        gap="3px"
        flexShrink={0}
        minW="90px"
      >
        <Text
          fontSize="11px"
          fontWeight={600}
          fontFamily={mono}
          color={config.color}
        >
          {hasLiveProgress
            ? `${liveCompleted}/${liveTotal}`
            : `${job.completedFiles}/${job.totalFiles}`}
        </Text>

        {hasLiveProgress && (
          <>
            <Box
              w="80px"
              h="3px"
              borderRadius="full"
              bg="rgba(255,255,255,0.08)"
              overflow="hidden"
            >
              <Box
                h="100%"
                w={`${Math.min(
                  100,
                  Math.max(0, livePercent),
                )}%`}
                bg="#818CF8"
                transition="width 150ms linear"
              />
            </Box>

            <Text
              fontSize="9px"
              color="rgba(255,255,255,0.38)"
              fontFamily={mono}
            >
              {livePercent}%
            </Text>
          </>
        )}

        {(hasLiveProgress
          ? liveFailed
          : job.failedFiles) > 0 && (
          <Text
            fontSize="9px"
            color="#E57373"
            fontFamily={mono}
          >
            {hasLiveProgress
              ? liveFailed
              : job.failedFiles}{" "}
            failed
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

export default JobRow;