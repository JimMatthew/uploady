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
import { ActionButton } from "../components/transfers/TransferComponents";

import {
  deriveJobStatus,
  formatDuration,
  formatSize,
  formatTime,
  getStatusBackground,
  getStatusBorder,
  getTransferStatus,
} from "../utils/transferUtils";

import JobRow from "../components/transfers/JobRow";

const mono = "'JetBrains Mono', monospace";

const ACTIVE_JOB_STATUSES = new Set([
  "planning",
  "expanding",
  "running",
  "in_progress",
]);

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
