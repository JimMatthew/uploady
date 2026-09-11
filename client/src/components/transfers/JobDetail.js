import { useCallback, useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";
import {
  ActionButton,
  FilterPill,
  PageButton,
} from "./TransferComponents";

import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";

import {
  deriveJobStatus,
  formatDuration,
  formatSize,
  formatTime,
  getTransferStatus,
} from "../../utils/transferUtils";

const mono = "'JetBrains Mono', monospace";

const FILTERS = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Failed",
    value: "failed",
  },
  {
    label: "Completed",
    value: "completed",
  },
  {
    label: "In Progress",
    value: "in_progress",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Skipped",
    value: "skipped",
  },
];

const getItemDurationMs = (item) => {
  if (item.durationMs !== null && item.durationMs !== undefined) {
    return item.durationMs;
  }

  if (item.startedAt && item.completedAt) {
    return new Date(item.completedAt) - new Date(item.startedAt);
  }

  if (item.startedAt && item.status === "in_progress") {
    return new Date() - new Date(item.startedAt);
  }

  return null;
};

// ---------------------------------------------------------------------------
// Item row
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Job detail
// ---------------------------------------------------------------------------

const JobDetail = ({ job, onBack, onRetry, onDelete }) => {
  const jobId = job._id;

  const [loadingItems, setLoadingItems] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);

    try {
      const data = await apiClient.get(
        `/api/jobs/${jobId}/items?page=${page}&limit=100&status=${statusFilter}`,
      );

      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalItems(data.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch job items:", err);

      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoadingItems(false);
    }
  }, [jobId, page, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const status = deriveJobStatus(job);
  const statusConfig = getTransferStatus(status);

  const handleRetry = async () => {
    setRetrying(true);

    try {
      await onRetry(jobId);
      onBack();
    } finally {
      setRetrying(false);
    }
  };

  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <Box h="100%" minH={0} display="flex" flexDirection="column">
      {/* Header */}

      <Flex
        align="center"
        gap={3}
        px={4}
        py={3}
        bg="rgba(255,255,255,0.012)"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.06)"
        flexShrink={0}
        flexWrap="wrap"
      >
        <Flex
          align="center"
          gap={2}
          cursor="pointer"
          color="rgba(255,255,255,0.38)"
          transition="color 120ms ease"
          onClick={onBack}
          flexShrink={0}
          _hover={{
            color: "rgba(255,255,255,0.78)",
          }}
        >
          <Icon as={FiChevronLeft} boxSize="13px" />

          <Text fontSize="11px" fontWeight={500} fontFamily={mono}>
            Transfers
          </Text>
        </Flex>

        <Box w="1px" h="14px" bg="rgba(255,255,255,0.08)" flexShrink={0} />

        <Flex align="center" gap="6px">
          <Icon
            as={statusConfig.icon}
            boxSize="11px"
            color={statusConfig.color}
          />

          <Text
            fontSize="12px"
            fontWeight={600}
            color="rgba(255,255,255,0.84)"
            fontFamily={mono}
            letterSpacing="-0.01em"
          >
            {job.destServer}
          </Text>
        </Flex>

        <Text fontSize="10px" color="rgba(255,255,255,0.36)" fontFamily={mono}>
          {formatTime(job.createdAt)}
        </Text>

        <Text fontSize="10px" color="rgba(255,255,255,0.36)" fontFamily={mono}>
          {formatDuration(job.durationMs)}
        </Text>

        <Text fontSize="10px" color="rgba(255,255,255,0.36)" fontFamily={mono}>
          {job.completedFiles}/{job.totalFiles} files
          {job.totalBytes > 0 && ` · ${formatSize(job.totalBytes)}`}
        </Text>

        <Flex gap={2} ml="auto" flexShrink={0}>
          {job.failedFiles > 0 && (
            <Flex
              align="center"
              gap={2}
              px={3}
              h="30px"
              borderRadius="7px"
              bg="rgba(229,115,115,0.065)"
              border="1px solid"
              borderColor="rgba(229,115,115,0.16)"
              cursor={retrying ? "not-allowed" : "pointer"}
              opacity={retrying ? 0.55 : 1}
              transition="
                background 120ms ease,
                border-color 120ms ease
              "
              onClick={retrying ? undefined : handleRetry}
              _hover={
                retrying
                  ? {}
                  : {
                      bg: "rgba(229,115,115,0.11)",
                      borderColor: "rgba(229,115,115,0.25)",
                    }
              }
            >
              <Icon as={FiRefreshCw} boxSize="11px" color="#E57373" />

              <Text
                fontSize="10px"
                fontWeight={600}
                color="#E57373"
                fontFamily={mono}
              >
                Retry {job.failedFiles} failed
              </Text>
            </Flex>
          )}

          <ActionButton onClick={() => onDelete(job._id)} danger>
            <Icon as={FiTrash2} boxSize="11px" />

            <Text fontSize="10px" fontWeight={500} fontFamily={mono}>
              Clear
            </Text>
          </ActionButton>
        </Flex>
      </Flex>

      {/* Filter + pagination */}

      <Flex
        align="center"
        gap={2}
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.05)"
        flexShrink={0}
        flexWrap="wrap"
      >
        <Flex gap="6px" flex={1} flexWrap="wrap">
          {FILTERS.map((filter) => (
            <FilterPill
              key={filter.value}
              label={filter.label}
              value={filter.value}
              active={statusFilter === filter.value}
              onClick={handleFilterChange}
            />
          ))}
        </Flex>

        <Flex align="center" gap={3} flexShrink={0}>
          <Text
            fontSize="10px"
            color="rgba(255,255,255,0.36)"
            fontFamily={mono}
          >
            {totalItems} items
          </Text>

          {totalPages > 1 && (
            <Flex align="center" gap={2}>
              <PageButton
                onClick={() => setPage((current) => current - 1)}
                disabled={page <= 1}
              >
                <Icon as={FiChevronLeft} boxSize="12px" />
              </PageButton>

              <Text
                minW="48px"
                textAlign="center"
                fontSize="10px"
                color="rgba(255,255,255,0.36)"
                fontFamily={mono}
              >
                {page} / {totalPages}
              </Text>

              <PageButton
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= totalPages}
              >
                <Icon as={FiChevronRight} boxSize="12px" />
              </PageButton>
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* Column headers */}

      <Flex
        px={4}
        py="7px"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.045)"
        bg="rgba(255,255,255,0.012)"
        gap={3}
        flexShrink={0}
      >
        <Text
          flex={1}
          fontSize="9px"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.3)"
          fontFamily={mono}
        >
          File
        </Text>

        <Text
          minW="58px"
          textAlign="right"
          fontSize="9px"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.3)"
          fontFamily={mono}
        >
          Size
        </Text>

        <Text
          minW="50px"
          textAlign="right"
          fontSize="9px"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.3)"
          fontFamily={mono}
        >
          Time
        </Text>

        <Box minW="78px" />
      </Flex>

      {/* Items */}

      <Box flex={1} minH={0} overflowY="auto">
        {loadingItems ? (
          <Flex align="center" justify="center" h="160px">
            <Spinner size="sm" color="#818CF8" opacity={0.55} />
          </Flex>
        ) : items.length === 0 ? (
          <Flex align="center" justify="center" h="160px">
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.24)"
              fontFamily={mono}
            >
              No items match this filter
            </Text>
          </Flex>
        ) : (
          items.map((item) => <ItemRow key={item._id} item={item} />)
        )}
      </Box>
    </Box>
  );
};

export default JobDetail;
