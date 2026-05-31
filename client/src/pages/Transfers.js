// client/src/pages/Transfers.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Box, Flex, Text, Icon, Spinner, Badge
} from "@chakra-ui/react";
import {
  FiArrowRight, FiCheck, FiX, FiAlertTriangle,
  FiRefreshCw, FiTrash2, FiChevronLeft, FiClock,
  FiFile, FiLoader, FiZap
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDuration = (ms) => {
  if (!ms) return "—";
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

const statusColor = (status) => ({
  completed: "#22C55E",
  running:   "#6366F1",
  expanding: "#6366F1",
  failed:    "#EF4444",
  partial:   "#F59E0B",
  queued:    "rgba(255,255,255,0.3)",
  cancelled: "rgba(255,255,255,0.3)",
}[status] ?? "rgba(255,255,255,0.3)");

const statusIcon = (status) => ({
  completed: FiCheck,
  running:   FiLoader,
  expanding: FiLoader,
  failed:    FiX,
  partial:   FiAlertTriangle,
  queued:    FiClock,
  cancelled: FiX,
}[status] ?? FiClock);

const deriveJobStatus = (job) => {
  if (job.status !== "completed") return job.status;
  if (job.failedFiles > 0 && job.completedFiles > 0) return "partial";
  if (job.failedFiles > 0 && job.completedFiles === 0) return "failed";
  return "completed";
};

// ─── Item Row ─────────────────────────────────────────────────────────────────

const ItemRow = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const failed = item.status === "failed";
  const completed = item.status === "completed";

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
        <Text
          fontSize="12px"
          fontFamily="'JetBrains Mono', monospace"
          color={failed ? "#EF4444" : "rgba(255,255,255,0.7)"}
          flex={1}
          noOfLines={1}
          letterSpacing="-0.01em"
        >
          {item.filename}
        </Text>
        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.25)"
          fontFamily="'JetBrains Mono', monospace"
          flexShrink={0}
        >
          {item.sourcePath?.split("/").slice(0, -1).join("/") || ""}
        </Text>
        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.3)"
          fontFamily="'JetBrains Mono', monospace"
          flexShrink={0}
          minW="50px"
          textAlign="right"
        >
          {formatSize(item.size)}
        </Text>
        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.25)"
          fontFamily="'JetBrains Mono', monospace"
          flexShrink={0}
          minW="40px"
          textAlign="right"
        >
          {formatDuration(item.durationMs)}
        </Text>
        {item.speedMBs && (
          <Flex align="center" gap={1} flexShrink={0}>
            <Icon as={FiZap} boxSize="9px" color="rgba(99,102,241,0.5)" />
            <Text
              fontSize="11px"
              color="rgba(99,102,241,0.7)"
              fontFamily="'JetBrains Mono', monospace"
            >
              {item.speedMBs} MB/s
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Error detail */}
      {expanded && item.error && (
        <Box
          px={8}
          py={2}
          bg="rgba(239,68,68,0.06)"
          borderBottom="1px solid rgba(239,68,68,0.1)"
        >
          <Text
            fontSize="11px"
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(239,68,68,0.8)"
          >
            {item.error}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─── Job Detail ───────────────────────────────────────────────────────────────

const JobDetail = ({ jobId, token, onBack, onRetry, onDelete }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [jobId, token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return (
    <Flex align="center" justify="center" h="200px">
      <Spinner size="sm" color="rgba(99,102,241,0.5)" />
    </Flex>
  );

  if (!data) return null;

  const { job, items } = data;
  const status = deriveJobStatus(job);
  const failed = items.filter((i) => i.status === "failed");
  const completed = items.filter((i) => i.status === "completed");
  const other = items.filter(
    (i) => i.status !== "failed" && i.status !== "completed"
  );

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry(jobId);
      onBack();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Header */}
      <Flex
        align="center"
        gap={3}
        px={4}
        py={3}
        borderBottom="1px solid rgba(255,255,255,0.06)"
        flexShrink={0}
      >
        <Flex
          align="center"
          gap={2}
          cursor="pointer"
          color="rgba(255,255,255,0.4)"
          _hover={{ color: "rgba(255,255,255,0.8)" }}
          transition="color 0.12s"
          onClick={onBack}
          mr={2}
        >
          <Icon as={FiChevronLeft} boxSize="14px" />
          <Text fontSize="12px" fontWeight={500}>Transfers</Text>
        </Flex>

        <Icon
          as={statusIcon(status)}
          boxSize="12px"
          color={statusColor(status)}
        />
        <Text
          fontSize="13px"
          fontWeight={600}
          color="rgba(255,255,255,0.8)"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="-0.01em"
        >
          {job.destServer}
        </Text>
        <Text fontSize="12px" color="rgba(255,255,255,0.3)">
          {formatTime(job.createdAt)}
        </Text>
        <Text fontSize="12px" color="rgba(255,255,255,0.25)">
          {formatDuration(job.durationMs)}
        </Text>

        <Flex gap={2} ml="auto">
          {failed.length > 0 && (
            <Flex
              align="center"
              gap={2}
              px={3}
              h="28px"
              borderRadius="6px"
              bg="rgba(239,68,68,0.1)"
              border="1px solid rgba(239,68,68,0.2)"
              cursor="pointer"
              _hover={{ bg: "rgba(239,68,68,0.18)" }}
              transition="all 0.12s"
              onClick={handleRetry}
              opacity={retrying ? 0.5 : 1}
            >
              <Icon as={FiRefreshCw} boxSize="11px" color="#EF4444" />
              <Text fontSize="11px" fontWeight={600} color="#EF4444">
                Retry {failed.length} failed
              </Text>
            </Flex>
          )}
          <Flex
            align="center"
            gap={2}
            px={3}
            h="28px"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.08)"
            cursor="pointer"
            color="rgba(255,255,255,0.35)"
            _hover={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }}
            transition="all 0.12s"
            onClick={() => onDelete(job._id)}
          >
            <Icon as={FiTrash2} boxSize="11px" />
            <Text fontSize="11px" fontWeight={500}>Clear</Text>
          </Flex>
        </Flex>
      </Flex>

      {/* Column headers */}
      <Flex
        px={4}
        py={2}
        borderBottom="1px solid rgba(255,255,255,0.05)"
        gap={3}
        flexShrink={0}
      >
        {["file", "path", "size", "duration", "speed"].map((h) => (
          <Text
            key={h}
            fontSize="10px"
            fontWeight={700}
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="rgba(255,255,255,0.2)"
            fontFamily="'JetBrains Mono', monospace"
            flex={h === "file" ? 1 : undefined}
            minW={h === "path" ? undefined : h === "size" ? "50px" : "40px"}
            textAlign={["size", "duration"].includes(h) ? "right" : "left"}
          >
            {h}
          </Text>
        ))}
      </Flex>

      {/* Items */}
      <Box flex={1} overflowY="auto">
        {/* Failed */}
        {failed.length > 0 && (
          <Box>
            <Flex
              px={4}
              py={2}
              align="center"
              gap={2}
              bg="rgba(239,68,68,0.04)"
              borderBottom="1px solid rgba(239,68,68,0.08)"
            >
              <Icon as={FiX} boxSize="10px" color="#EF4444" />
              <Text
                fontSize="10px"
                fontWeight={700}
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="rgba(239,68,68,0.7)"
                fontFamily="'JetBrains Mono', monospace"
              >
                Failed — {failed.length}
              </Text>
            </Flex>
            {failed.map((item) => (
              <ItemRow key={item._id} item={item} />
            ))}
          </Box>
        )}

        {/* Other (pending/in_progress) */}
        {other.length > 0 && (
          <Box>
            <Flex px={4} py={2} align="center" gap={2}
              borderBottom="1px solid rgba(255,255,255,0.05)"
            >
              <Text fontSize="10px" fontWeight={700} letterSpacing="0.08em"
                textTransform="uppercase" color="rgba(255,255,255,0.2)"
                fontFamily="'JetBrains Mono', monospace"
              >
                In Progress — {other.length}
              </Text>
            </Flex>
            {other.map((item) => <ItemRow key={item._id} item={item} />)}
          </Box>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <Box>
            <Flex px={4} py={2} align="center" gap={2}
              borderBottom="1px solid rgba(255,255,255,0.05)"
            >
              <Icon as={FiCheck} boxSize="10px" color="#22C55E" />
              <Text fontSize="10px" fontWeight={700} letterSpacing="0.08em"
                textTransform="uppercase" color="rgba(34,197,94,0.6)"
                fontFamily="'JetBrains Mono', monospace"
              >
                Completed — {completed.length}
              </Text>
            </Flex>
            {completed.map((item) => <ItemRow key={item._id} item={item} />)}
          </Box>
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

      {/* Status + servers */}
      <Box flex={1} minW={0}>
        <Flex align="center" gap={2} mb="2px">
          <Text
            fontSize="12px"
            fontWeight={600}
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.75)"
            letterSpacing="-0.01em"
            noOfLines={1}
          >
            {job.destServer}
          </Text>
          <Icon as={FiArrowRight} boxSize="10px" color="rgba(255,255,255,0.2)" />
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.35)"
            fontFamily="'JetBrains Mono', monospace"
            noOfLines={1}
          >
            {job.destPath}
          </Text>
        </Flex>
        <Flex align="center" gap={3}>
          <Text fontSize="11px" color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {formatTime(job.createdAt)}
          </Text>
          <Text fontSize="11px" color="rgba(255,255,255,0.2)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {formatDuration(job.durationMs)}
          </Text>
        </Flex>
      </Box>

      {/* File counts */}
      <Flex direction="column" align="flex-end" gap="2px" flexShrink={0}>
        <Text
          fontSize="12px"
          fontWeight={600}
          fontFamily="'JetBrains Mono', monospace"
          color={color}
        >
          {job.completedFiles}/{job.totalFiles}
        </Text>
        {job.failedFiles > 0 && (
          <Text fontSize="10px" color="#EF4444"
            fontFamily="'JetBrains Mono', monospace"
          >
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
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleRetry = async (jobId) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      await fetchJobs();
      toast({ title: "Retry job created", status: "success", duration: 2000 });
    } catch {
      toast({ title: "Failed to retry", status: "error", duration: 2000 });
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedJobId(null);
      await fetchJobs();
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000 });
    }
  };

  const handleClearCompleted = async () => {
    setClearing(true);
    try {
      await fetch("/api/jobs", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchJobs();
    } catch {
      toast({ title: "Failed to clear", status: "error", duration: 2000 });
    } finally {
      setClearing(false);
    }
  };

  const hasCompleted = jobs.some((j) => deriveJobStatus(j) === "completed");

  if (selectedJobId) {
    return (
      <JobDetail
        jobId={selectedJobId}
        token={token}
        onBack={() => { setSelectedJobId(null); fetchJobs(); }}
        onRetry={handleRetry}
        onDelete={async (id) => { await handleDelete(id); }}
      />
    );
  }

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Header */}
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
            color="rgba(255,255,255,0.7)"
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="-0.01em"
          >
            Transfers
          </Text>
          <Text
            fontSize="11px"
            color="rgba(255,255,255,0.25)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {jobs.length}
          </Text>
        </Flex>

        <Flex align="center" gap={2}>
          <Flex
            align="center"
            gap={2}
            px={3}
            h="28px"
            borderRadius="6px"
            border="1px solid rgba(255,255,255,0.08)"
            cursor="pointer"
            color="rgba(255,255,255,0.35)"
            _hover={{ borderColor: "rgba(99,102,241,0.3)", color: "#818CF8" }}
            transition="all 0.12s"
            onClick={fetchJobs}
          >
            <Icon as={FiRefreshCw} boxSize="11px" />
            <Text fontSize="11px" fontWeight={500}>Refresh</Text>
          </Flex>

          {hasCompleted && (
            <Flex
              align="center"
              gap={2}
              px={3}
              h="28px"
              borderRadius="6px"
              border="1px solid rgba(255,255,255,0.08)"
              cursor="pointer"
              color="rgba(255,255,255,0.35)"
              _hover={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }}
              transition="all 0.12s"
              onClick={handleClearCompleted}
              opacity={clearing ? 0.5 : 1}
            >
              <Icon as={FiTrash2} boxSize="11px" />
              <Text fontSize="11px" fontWeight={500}>Clear completed</Text>
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* Job list */}
      <Box flex={1} overflowY="auto">
        {loading ? (
          <Flex align="center" justify="center" h="200px">
            <Spinner size="sm" color="rgba(99,102,241,0.5)" />
          </Flex>
        ) : jobs.length === 0 ? (
          <Flex align="center" justify="center" h="200px" direction="column" gap={3}>
            <Icon as={FiArrowRight} boxSize="24px" color="rgba(255,255,255,0.1)" />
            <Text fontSize="12px" color="rgba(255,255,255,0.2)"
              fontFamily="'JetBrains Mono', monospace"
            >
              No transfers yet
            </Text>
          </Flex>
        ) : (
          jobs.map((job) => (
            <JobRow
              key={job._id}
              job={job}
              onClick={() => setSelectedJobId(job._id)}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default Transfers;