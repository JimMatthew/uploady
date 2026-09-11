import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";
import { useTransferJob } from "../hooks/useTransferJob";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiLoader,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import JobDetail from "../components/transfers/JobDetail";
import apiClient from "../services/apiClient";
import ActionButton from "../components/transfers/ActionButton";

import {
  deriveJobStatus,
  formatDuration,
  formatSize,
  formatTime,
  getStatusBackground,
  getStatusBorder,
  getTransferStatus,
} from "../utils/transferUtils";

const mono = "'JetBrains Mono', monospace";

const ACTIVE_JOB_STATUSES = new Set([
  "planning",
  "expanding",
  "running",
  "in_progress",
]);

const getStatus = (status) =>
  STATUS[status] ?? {
    color: "rgba(255,255,255,0.32)",
    icon: FiClock,
  };

// ---------------------------------------------------------------------------
// Job row
// ---------------------------------------------------------------------------

const JobRow = ({ job, progressMap, onClick }) => {
  const status = deriveJobStatus(job);
  const config = getTransferStatus(status);

  const liveRoots = Object.entries(progressMap)
    .filter(([key]) => key.startsWith(`${job._id}-`))
    .map(([, value]) => value);

  const hasLiveProgress = liveRoots.length > 0;

  const liveTotal = liveRoots.reduce((sum, root) => sum + (root.total ?? 0), 0);

  const liveCompleted = liveRoots.reduce(
    (sum, root) => sum + (root.completed ?? 0),
    0,
  );

  const liveFailed = liveRoots.reduce(
    (sum, root) => sum + (root.failed ?? 0),
    0,
  );

  const getRootPercent = (root) => {
    if (typeof root.progress === "number" && root.progress > 0) {
      return root.progress;
    }

    if (root.total > 0) {
      return Math.round(((root.completed + root.failed) / root.total) * 100);
    }

    return 0;
  };

  const livePercent =
    liveRoots.length > 0
      ? Math.round(
          liveRoots.reduce((sum, root) => sum + getRootPercent(root), 0) /
            liveRoots.length,
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
                w={`${Math.min(100, Math.max(0, livePercent))}%`}
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

        {(hasLiveProgress ? liveFailed : job.failedFiles) > 0 && (
          <Text fontSize="9px" color="#E57373" fontFamily={mono}>
            {hasLiveProgress ? liveFailed : job.failedFiles} failed
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
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const attachedJobRef = useRef(null);

  const { progressMap, attachJob } = useTransferJob({
    onError: (event) => {
      console.error("Transfer progress connection interrupted:", event);
    },
  });

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

  useEffect(() => {
    const activeJob = jobs.find((job) => ACTIVE_JOB_STATUSES.has(job.status));

    if (!activeJob) {
      attachedJobRef.current = null;
      return;
    }

    if (attachedJobRef.current === activeJob._id) {
      return;
    }

    attachedJobRef.current = activeJob._id;

    attachJob({
      jobId: activeJob._id,

      onDone: () => {
        attachedJobRef.current = null;
        fetchJobs();
      },
    });
  }, [jobs, attachJob, fetchJobs]);

  const selectedJob =
    selectedJobId === null
      ? null
      : (jobs.find((job) => job._id === selectedJobId) ?? null);

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

      if (selectedJobId === jobId) {
        setSelectedJobId(null);
      }

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

      setSelectedJobId(null);

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

  /*
   * A partially-successful job is persisted by the
   * backend as "completed" and only derived as
   * "partial" in the UI, so check the persisted
   * status here rather than deriveJobStatus().
   */
  const hasCompleted = jobs.some((job) => job.status === "completed");

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        onBack={() => {
          setSelectedJobId(null);
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
              progressMap={progressMap}
              onClick={() => setSelectedJobId(job._id)}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default Transfers;
