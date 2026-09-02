import { useState, useEffect, useCallback } from "react";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import {
  FiArrowRight,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiRefreshCw,
  FiTrash2,
  FiChevronLeft,
  FiClock,
  FiLoader,
  FiZap,
  FiChevronRight,
} from "react-icons/fi";
import apiClient from "../services/apiClient";
// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
};

const statusColor = (status) =>
  ({
    completed: "#22C55E",
    running: "#6366F1",
    expanding: "#6366F1",
    failed: "#EF4444",
    partial: "#F59E0B",
    queued: "rgba(255,255,255,0.3)",
    cancelled: "rgba(255,255,255,0.3)",
    pending: "rgba(255,255,255,0.3)",
    in_progress: "#6366F1",
  })[status] ?? "rgba(255,255,255,0.3)";

const statusIcon = (status) =>
  ({
    completed: FiCheck,
    running: FiLoader,
    expanding: FiLoader,
    failed: FiX,
    partial: FiAlertTriangle,
    queued: FiClock,
    cancelled: FiX,
    pending: FiClock,
    in_progress: FiLoader,
  })[status] ?? FiClock;

const deriveJobStatus = (job) => {
  if (job.status !== "completed") return job.status;
  if (job.failedFiles > 0 && job.completedFiles > 0) return "partial";
  if (job.failedFiles > 0 && job.completedFiles === 0) return "failed";
  return "completed";
};

const getItemDurationMs = (item) => {
  if (item.durationMs !== null && item.durationMs !== undefined)
    return item.durationMs;
  if (item.startedAt && item.completedAt)
    return new Date(item.completedAt) - new Date(item.startedAt);
  if (item.startedAt && item.status === "in_progress")
    return new Date() - new Date(item.startedAt);
  return null;
};

// ─── Shared Primitives ────────────────────────────────────────────────────────

const mono = "'JetBrains Mono', monospace";

const ActionButton = ({
  onClick,
  color = "rgba(255,255,255,0.35)",
  hoverColor,
  hoverBorder,
  children,
  opacity = 1,
}) => (
  <Flex
    align="center"
    gap={2}
    px={3}
    h="28px"
    borderRadius="6px"
    border="1px solid rgba(255,255,255,0.08)"
    cursor="pointer"
    color={color}
    opacity={opacity}
    _hover={{
      borderColor: hoverBorder ?? "rgba(99,102,241,0.3)",
      color: hoverColor ?? "#818CF8",
    }}
    transition="all 0.12s"
    onClick={onClick}
    userSelect="none"
  >
    {children}
  </Flex>
);

const FilterPill = ({ label, value, active, onClick }) => (
  <Flex
    align="center"
    px={3}
    h="26px"
    borderRadius="6px"
    border="1px solid"
    borderColor={active ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}
    bg={active ? "rgba(99,102,241,0.12)" : "transparent"}
    color={active ? "#818CF8" : "rgba(255,255,255,0.3)"}
    cursor="pointer"
    fontSize="11px"
    fontWeight={active ? 600 : 400}
    fontFamily={mono}
    transition="all 0.12s"
    onClick={() => onClick(value)}
    userSelect="none"
    _hover={{
      borderColor: active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.15)",
      color: active ? "#818CF8" : "rgba(255,255,255,0.6)",
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
    border="1px solid rgba(255,255,255,0.08)"
    cursor={disabled ? "not-allowed" : "pointer"}
    color={disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)"}
    opacity={disabled ? 0.5 : 1}
    transition="all 0.12s"
    onClick={disabled ? undefined : onClick}
    userSelect="none"
    _hover={
      disabled
        ? {}
        : {
            borderColor: "rgba(99,102,241,0.3)",
            color: "#818CF8",
          }
    }
  >
    {children}
  </Flex>
);

// ─── Item Row ─────────────────────────────────────────────────────────────────

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
        py={2}
        borderBottom="1px solid rgba(255,255,255,0.04)"
        cursor={failed ? "pointer" : "default"}
        _hover={failed ? { bg: "rgba(239,68,68,0.04)" } : {}}
        onClick={() => failed && setExpanded((p) => !p)}
        transition="background 0.12s"
      >
        <Icon
          as={statusIcon(item.status)}
          boxSize="11px"
          color={statusColor(item.status)}
          flexShrink={0}
        />

        <Box flex={1} minW={0}>
          <Text
            fontSize="13px"
            fontWeight={500}
            fontFamily={mono}
            color={failed ? "#EF4444" : "rgba(255,255,255,0.85)"}
            letterSpacing="-0.01em"
            noOfLines={1}
            mb="3px"
          >
            {item.filename}
          </Text>
          <Flex align="center" gap={2} minW={0}>
            <Text
              fontSize="11px"
              fontFamily={mono}
              color="rgba(255,255,255,0.5)"
              noOfLines={1}
            >
              {item.sourceServer || "local"}:{item.sourcePath}
            </Text>
            <Icon
              as={FiArrowRight}
              boxSize="8px"
              color="rgba(255,255,255,0.4)"
              flexShrink={0}
            />
            <Text
              fontSize="11px"
              fontFamily={mono}
              color="rgba(255,255,255,0.5)"
              noOfLines={1}
            >
              {item.destinationPath}
            </Text>
          </Flex>
        </Box>

        <Flex align="center" gap={4} flexShrink={0}>
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.5)"
            fontFamily={mono}
            minW="50px"
            textAlign="right"
          >
            {formatSize(item.size)}
          </Text>
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.45)"
            fontFamily={mono}
            minW="45px"
            textAlign="right"
          >
            {formatDuration(durationMs)}
          </Text>
          {item.speedMBs ? (
            <Flex align="center" gap={1} minW="70px">
              <Icon as={FiZap} boxSize="10px" color="#A5B4FC" />
              <Text
                fontSize="11px"
                color="#A5B4FC"
                fontFamily={mono}
                fontWeight={500}
              >
                {item.speedMBs} MB/s
              </Text>
            </Flex>
          ) : (
            <Box minW="70px" />
          )}
        </Flex>
      </Flex>

      {expanded && item.error && (
        <Flex
          px={8}
          py={2}
          gap={2}
          align="flex-start"
          bg="rgba(239,68,68,0.05)"
          borderBottom="1px solid rgba(239,68,68,0.08)"
        >
          <Icon
            as={FiX}
            boxSize="10px"
            color="rgba(239,68,68,0.6)"
            mt="2px"
            flexShrink={0}
          />
          <Text
            fontSize="11px"
            fontFamily={mono}
            color="rgba(239,68,68,0.75)"
            lineHeight="1.6"
          >
            {item.error}
          </Text>
        </Flex>
      )}
    </Box>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Failed", value: "failed" },
  { label: "Completed", value: "completed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Pending", value: "pending" },
  { label: "Skipped", value: "skipped" },
];

// ─── Job Detail ───────────────────────────────────────────────────────────────

const JobDetail = ({ job, token, onBack, onRetry, onDelete }) => {
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
    <Box h="100%" display="flex" flexDirection="column">
      {/* ── Header ── */}
      <Flex
        align="center"
        gap={3}
        px={4}
        py={3}
        borderBottom="1px solid rgba(255,255,255,0.06)"
        flexShrink={0}
        flexWrap="wrap"
      >
        <Flex
          align="center"
          gap={2}
          cursor="pointer"
          color="rgba(255,255,255,0.35)"
          _hover={{ color: "rgba(255,255,255,0.7)" }}
          transition="color 0.12s"
          onClick={onBack}
          flexShrink={0}
        >
          <Icon as={FiChevronLeft} boxSize="13px" />
          <Text fontSize="12px" fontWeight={500} fontFamily={mono}>
            Transfers
          </Text>
        </Flex>

        <Box w="1px" h="14px" bg="rgba(255,255,255,0.08)" flexShrink={0} />

        <Icon
          as={statusIcon(status)}
          boxSize="12px"
          color={statusColor(status)}
          flexShrink={0}
        />

        <Text
          fontSize="13px"
          fontWeight={600}
          color="rgba(255,255,255,0.85)"
          fontFamily={mono}
          letterSpacing="-0.01em"
        >
          {job.destServer}
        </Text>

        <Text fontSize="11px" color="rgba(255,255,255,0.5)" fontFamily={mono}>
          {formatTime(job.createdAt)}
        </Text>

        <Text fontSize="11px" color="rgba(255,255,255,0.5)" fontFamily={mono}>
          {formatDuration(job.durationMs)}
        </Text>

        <Text fontSize="11px" color="rgba(255,255,255,0.5)" fontFamily={mono}>
          {job.completedFiles}/{job.totalFiles} files
          {job.totalBytes > 0 && ` · ${formatSize(job.totalBytes)}`}
        </Text>

        <Flex gap={2} ml="auto" flexShrink={0}>
          {job.failedFiles > 0 && (
            <Flex
              align="center"
              gap={2}
              px={3}
              h="28px"
              borderRadius="6px"
              bg="rgba(239,68,68,0.08)"
              border="1px solid rgba(239,68,68,0.2)"
              cursor="pointer"
              opacity={retrying ? 0.5 : 1}
              _hover={{ bg: "rgba(239,68,68,0.15)" }}
              transition="all 0.12s"
              onClick={handleRetry}
            >
              <Icon as={FiRefreshCw} boxSize="11px" color="#EF4444" />
              <Text
                fontSize="11px"
                fontWeight={600}
                color="#EF4444"
                fontFamily={mono}
              >
                Retry {job.failedFiles} failed
              </Text>
            </Flex>
          )}
          <ActionButton
            onClick={() => onDelete(job._id)}
            hoverColor="#EF4444"
            hoverBorder="rgba(239,68,68,0.3)"
          >
            <Icon as={FiTrash2} boxSize="11px" />
            <Text fontSize="11px" fontWeight={500} fontFamily={mono}>
              Clear
            </Text>
          </ActionButton>
        </Flex>
      </Flex>

      {/* ── Filter + Pagination Bar ── */}
      <Flex
        align="center"
        gap={2}
        px={4}
        py={2}
        borderBottom="1px solid rgba(255,255,255,0.05)"
        flexShrink={0}
        flexWrap="wrap"
      >
        {/* Filter pills */}
        <Flex gap={2} flex={1} flexWrap="wrap">
          {FILTERS.map((f) => (
            <FilterPill
              key={f.value}
              label={f.label}
              value={f.value}
              active={statusFilter === f.value}
              onClick={handleFilterChange}
            />
          ))}
        </Flex>

        {/* Item count + pagination */}
        <Flex align="center" gap={3} flexShrink={0}>
          <Text fontSize="11px" color="rgba(255,255,255,0.5)" fontFamily={mono}>
            {totalItems} items
          </Text>

          {totalPages > 1 && (
            <Flex align="center" gap={2}>
              <PageButton
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              >
                <Icon as={FiChevronLeft} boxSize="12px" />
              </PageButton>
              <Text
                fontSize="11px"
                color="rgba(255,255,255,0.35)"
                fontFamily={mono}
              >
                {page} / {totalPages}
              </Text>
              <PageButton
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                <Icon as={FiChevronRight} boxSize="12px" />
              </PageButton>
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* ── Column Headers ── */}
      <Flex
        px={4}
        py="6px"
        borderBottom="1px solid rgba(255,255,255,0.04)"
        gap={3}
        flexShrink={0}
      >
        <Text
          flex={1}
          fontSize="10px"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.4)"
          fontFamily={mono}
        >
          file
        </Text>
        <Text
          fontSize="10px"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.4)"
          fontFamily={mono}
          minW="50px"
          textAlign="right"
        >
          size
        </Text>
        <Text
          fontSize="10px"
          fontWeight={700}
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.4)"
          fontFamily={mono}
          minW="45px"
          textAlign="right"
        >
          time
        </Text>
        <Box minW="70px" />
      </Flex>

      {/* ── Items ── */}
      <Box flex={1} overflowY="auto">
        {loadingItems ? (
          <Flex align="center" justify="center" h="160px">
            <Spinner size="sm" color="rgba(99,102,241,0.4)" />
          </Flex>
        ) : items.length === 0 ? (
          <Flex align="center" justify="center" h="160px">
            <Text
              fontSize="12px"
              color="rgba(255,255,255,0.2)"
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

// ─── Job Row ──────────────────────────────────────────────────────────────────

const JobRow = ({ job, onClick }) => {
  const status = deriveJobStatus(job);
  const color = statusColor(status);
  const StatusIcon = statusIcon(status);

  return (
    <Flex
      align="center"
      gap={3}
      px={4}
      py={3}
      borderBottom="1px solid rgba(255,255,255,0.04)"
      cursor="pointer"
      transition="background 0.12s"
      _hover={{ bg: "rgba(255,255,255,0.02)" }}
      onClick={onClick}
    >
      <Icon as={StatusIcon} boxSize="12px" color={color} flexShrink={0} />

      <Box flex={1} minW={0}>
        <Flex align="center" gap={2} mb="3px" minW={0}>
          <Text
            fontSize="12px"
            fontWeight={600}
            fontFamily={mono}
            color="rgba(255,255,255,0.75)"
            letterSpacing="-0.01em"
            flexShrink={0}
          >
            {job.sourceServers?.join(", ") || "local"}
          </Text>
          <Icon
            as={FiArrowRight}
            boxSize="10px"
            color="rgba(255,255,255,0.18)"
            flexShrink={0}
          />
          <Text
            fontSize="12px"
            fontWeight={600}
            fontFamily={mono}
            color="rgba(255,255,255,0.75)"
            letterSpacing="-0.01em"
            flexShrink={0}
          >
            {job.destServer}
          </Text>
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.3)"
            fontFamily={mono}
            noOfLines={1}
            minW={0}
          >
            {job.destPath}
          </Text>
        </Flex>
        <Flex align="center" gap={3}>
          <Text fontSize="11px" color="rgba(255,255,255,0.4)" fontFamily={mono}>
            {formatTime(job.createdAt)}
          </Text>
          <Text fontSize="11px" color="rgba(255,255,255,0.3)" fontFamily={mono}>
            {formatDuration(job.durationMs)}
          </Text>
          {job.totalBytes > 0 && (
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.3)"
              fontFamily={mono}
            >
              {formatSize(job.totalBytes)}
            </Text>
          )}
        </Flex>
      </Box>

      <Flex direction="column" align="flex-end" gap="2px" flexShrink={0}>
        <Text fontSize="12px" fontWeight={600} fontFamily={mono} color={color}>
          {job.completedFiles}/{job.totalFiles}
        </Text>
        {job.failedFiles > 0 && (
          <Text fontSize="10px" color="#EF4444" fontFamily={mono}>
            {job.failedFiles} failed
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Transfers = ({ toast }) => {
  const token = localStorage.getItem("token");
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

  const hasCompleted = jobs.some((j) => deriveJobStatus(j) === "completed");

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        token={token}
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
    <Box h="100%" display="flex" flexDirection="column">
      {/* ── Header ── */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        borderBottom="1px solid rgba(255,255,255,0.06)"
        flexShrink={0}
      >
        <Flex align="center" gap={2}>
          <Text
            fontSize="13px"
            fontWeight={700}
            fontFamily={mono}
            color="rgba(255,255,255,0.7)"
            letterSpacing="-0.01em"
          >
            Transfers
          </Text>
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.45)"
            fontFamily={mono}
          >
            {jobs.length}
          </Text>
        </Flex>

        <Flex align="center" gap={2}>
          <ActionButton onClick={fetchJobs}>
            <Icon as={FiRefreshCw} boxSize="11px" />
            <Text fontSize="11px" fontWeight={500} fontFamily={mono}>
              Refresh
            </Text>
          </ActionButton>

          {hasCompleted && (
            <ActionButton
              onClick={handleClearCompleted}
              hoverColor="#EF4444"
              hoverBorder="rgba(239,68,68,0.3)"
              opacity={clearing ? 0.5 : 1}
            >
              <Icon as={FiTrash2} boxSize="11px" />
              <Text fontSize="11px" fontWeight={500} fontFamily={mono}>
                Clear completed
              </Text>
            </ActionButton>
          )}
        </Flex>
      </Flex>

      {/* ── Job List ── */}
      <Box flex={1} overflowY="auto">
        {loadingJobs ? (
          <Flex align="center" justify="center" h="200px">
            <Spinner size="sm" color="rgba(99,102,241,0.4)" />
          </Flex>
        ) : jobs.length === 0 ? (
          <Flex
            align="center"
            justify="center"
            h="200px"
            direction="column"
            gap={3}
          >
            <Icon
              as={FiArrowRight}
              boxSize="20px"
              color="rgba(255,255,255,0.08)"
            />
            <Text
              fontSize="12px"
              color="rgba(255,255,255,0.2)"
              fontFamily={mono}
            >
              No transfers yet
            </Text>
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
