import { useCallback, useEffect, useState } from "react";
import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLoader,
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";

import apiClient from "../services/apiClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const mono = "'JetBrains Mono', monospace";

const STATUS = {
  completed: {
    color: "#6FCF97",
    icon: FiCheck,
  },

  running: {
    color: "#818CF8",
    icon: FiLoader,
  },

  planning: {
    color: "#818CF8",
    icon: FiLoader,
  },

  // Legacy compatibility
  expanding: {
    color: "#818CF8",
    icon: FiLoader,
  },

  failed: {
    color: "#E57373",
    icon: FiX,
  },

  partial: {
    color: "#D6A85F",
    icon: FiAlertTriangle,
  },

  queued: {
    color: "rgba(255,255,255,0.38)",
    icon: FiClock,
  },

  cancelled: {
    color: "rgba(255,255,255,0.32)",
    icon: FiX,
  },

  pending: {
    color: "rgba(255,255,255,0.34)",
    icon: FiClock,
  },

  in_progress: {
    color: "#818CF8",
    icon: FiLoader,
  },

  skipped: {
    color: "rgba(255,255,255,0.3)",
    icon: FiArrowRight,
  },
};

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDuration = (ms) => {
  if (ms === null || ms === undefined) {
    return "—";
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const formatSize = (bytes) => {
  if (!bytes) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatTime = (dateStr) => {
  if (!dateStr) {
    return "—";
  }

  const date = new Date(dateStr);
  const now = new Date();

  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return "just now";
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleDateString();
};

const getStatus = (status) =>
  STATUS[status] ?? {
    color: "rgba(255,255,255,0.32)",
    icon: FiClock,
  };

const deriveJobStatus = (job) => {
  if (job.status !== "completed") {
    return job.status;
  }

  if (job.failedFiles > 0 && job.completedFiles > 0) {
    return "partial";
  }

  if (job.failedFiles > 0 && job.completedFiles === 0) {
    return "failed";
  }

  return "completed";
};

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
// Shared primitives
// ---------------------------------------------------------------------------

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

const FilterPill = ({ label, value, active, onClick }) => (
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

const PageButton = ({ onClick, disabled, children }) => (
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

const StatusIcon = ({ status, size = "11px" }) => {
  const config = getStatus(status);

  return (
    <Icon as={config.icon} boxSize={size} color={config.color} flexShrink={0} />
  );
};

// ---------------------------------------------------------------------------
// Item row
// ---------------------------------------------------------------------------

const ItemRow = ({ item }) => {
  const [expanded, setExpanded] = useState(false);

  const failed = item.status === "failed";

  const durationMs = getItemDurationMs(item);

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
        onClick={() => failed && setExpanded((prev) => !prev)}
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
        <StatusIcon status={item.status} />

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
  const statusConfig = getStatus(status);

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

// ---------------------------------------------------------------------------
// Job row
// ---------------------------------------------------------------------------

const JobRow = ({ job, onClick }) => {
  const status = deriveJobStatus(job);

  const config = getStatus(status);

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
        bg={`${config.color}10`}
        border="1px solid"
        borderColor={`${config.color}1F`}
      >
        <Icon as={config.icon} boxSize="10px" color={config.color} />
      </Flex>

      <Box flex={1} minW={0}>
        <Flex align="center" gap={2} mb="3px" minW={0}>
          <Text
            fontSize="11px"
            fontWeight={600}
            fontFamily={mono}
            color="rgba(255,255,255,0.72)"
            letterSpacing="-0.01em"
            flexShrink={0}
          >
            {job.sourceServers?.join(", ") || "local"}
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

          <Text fontSize="10px" color="rgba(255,255,255,0.3)" fontFamily={mono}>
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

      <Flex direction="column" align="flex-end" gap="2px" flexShrink={0}>
        <Text
          fontSize="11px"
          fontWeight={600}
          fontFamily={mono}
          color={config.color}
        >
          {job.completedFiles}/{job.totalFiles}
        </Text>

        {job.failedFiles > 0 && (
          <Text fontSize="9px" color="#E57373" fontFamily={mono}>
            {job.failedFiles} failed
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const Transfers = ({ toast }) => {
  const [jobs, setJobs] = useState([]);

  const [loadingJobs, setLoadingJobs] = useState(true);

  const [selectedJob, setSelectedJob] = useState(null);

  const [clearing, setClearing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await apiClient.get("/api/jobs");

      setJobs(data.jobs ?? []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);

      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRetry = async (jobId) => {
    try {
      await apiClient.post(`/api/jobs/${jobId}/retry`);

      await fetchJobs();

      toast({
        title: "Retry job created",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      console.error("Failed to retry job:", err);

      toast({
        title: err.message || "Failed to retry",
        status: "error",
        duration: 2000,
      });
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await apiClient.delete(`/api/jobs/${jobId}`);

      setSelectedJob(null);
      await fetchJobs();
    } catch (err) {
      console.error("Failed to delete job:", err);

      toast({
        title: err.message || "Failed to delete",
        status: "error",
        duration: 2000,
      });
    }
  };

  const handleClearCompleted = async () => {
    setClearing(true);

    try {
      await apiClient.delete("/api/jobs");

      await fetchJobs();
    } catch (err) {
      console.error("Failed to clear completed jobs:", err);

      toast({
        title: err.message || "Failed to clear",
        status: "error",
        duration: 2000,
      });
    } finally {
      setClearing(false);
    }
  };

  const hasCompleted = jobs.some((job) => deriveJobStatus(job) === "completed");

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        onBack={() => {
          setSelectedJob(null);
          fetchJobs();
        }}
        onRetry={handleRetry}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <Box h="100%" minH={0} display="flex" flexDirection="column">
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        bg="rgba(255,255,255,0.012)"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.06)"
        flexShrink={0}
      >
        <Flex align="center" gap={2}>
          <Text
            fontSize="13px"
            fontWeight={700}
            fontFamily={mono}
            color="rgba(255,255,255,0.76)"
            letterSpacing="-0.01em"
          >
            Transfers
          </Text>

          <Flex
            align="center"
            justify="center"
            minW="20px"
            h="18px"
            px="5px"
            borderRadius="5px"
            bg="rgba(255,255,255,0.04)"
            border="1px solid"
            borderColor="rgba(255,255,255,0.06)"
          >
            <Text
              fontSize="9px"
              fontWeight={600}
              color="rgba(255,255,255,0.38)"
              fontFamily={mono}
            >
              {jobs.length}
            </Text>
          </Flex>
        </Flex>

        <Flex align="center" gap={2}>
          <ActionButton onClick={fetchJobs}>
            <Icon as={FiRefreshCw} boxSize="11px" />

            <Text fontSize="10px" fontWeight={500} fontFamily={mono}>
              Refresh
            </Text>
          </ActionButton>

          {hasCompleted && (
            <ActionButton
              onClick={handleClearCompleted}
              danger
              disabled={clearing}
            >
              <Icon as={FiTrash2} boxSize="11px" />

              <Text fontSize="10px" fontWeight={500} fontFamily={mono}>
                Clear completed
              </Text>
            </ActionButton>
          )}
        </Flex>
      </Flex>

      {/* Job list */}
      <Box flex={1} minH={0} overflowY="auto">
        {loadingJobs ? (
          <Flex align="center" justify="center" h="200px">
            <Spinner size="sm" color="#818CF8" opacity={0.55} />
          </Flex>
        ) : jobs.length === 0 ? (
          <Flex
            align="center"
            justify="center"
            h="220px"
            direction="column"
            gap={3}
          >
            <Flex
              align="center"
              justify="center"
              w="44px"
              h="44px"
              borderRadius="10px"
              bg="rgba(255,255,255,0.025)"
              border="1px solid"
              borderColor="rgba(255,255,255,0.065)"
            >
              <Icon
                as={FiArrowRight}
                boxSize="17px"
                color="rgba(129,140,248,0.5)"
              />
            </Flex>

            <Flex direction="column" align="center" gap="3px">
              <Text
                fontSize="12px"
                fontWeight={500}
                color="rgba(255,255,255,0.36)"
                fontFamily={mono}
              >
                No transfers yet
              </Text>

              <Text fontSize="10px" color="rgba(255,255,255,0.18)">
                Transfer history will appear here
              </Text>
            </Flex>
          </Flex>
        ) : (
          jobs.map((job) => (
            <JobRow
              key={job._id}
              job={job}
              onClick={() => setSelectedJob(job)}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default Transfers;
