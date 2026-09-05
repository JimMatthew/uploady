import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import {
  FiGithub,
  FiFolder,
  FiCpu,
  FiHardDrive,
  FiServer,
} from "react-icons/fi";
import apiClient, { ApiError } from "../services/apiClient";

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatRow = ({ label, value, accent }) => (
  <Flex
    align="center"
    justify="space-between"
    px={4}
    py="10px"
    borderBottom="1px solid rgba(255,255,255,0.05)"
    _last={{ borderBottom: "none" }}
  >
    <Text fontSize="12px" color="rgba(255,255,255,0.35)" letterSpacing="0.02em">
      {label}
    </Text>

    <Text
      fontSize="12px"
      fontWeight={600}
      fontFamily="'JetBrains Mono', monospace"
      color={accent || "rgba(255,255,255,0.75)"}
    >
      {value ?? "—"}
    </Text>
  </Flex>
);

const SectionHeader = ({ icon, label }) => (
  <Box px={4} py="10px" borderBottom="1px solid rgba(255,255,255,0.06)">
    <Flex align="center" gap={2}>
      <Icon as={icon} boxSize="12px" color="rgba(255,255,255,0.25)" />

      <Text
        fontSize="10px"
        fontWeight="700"
        letterSpacing="0.1em"
        textTransform="uppercase"
        color="rgba(255,255,255,0.25)"
      >
        {label}
      </Text>
    </Flex>
  </Box>
);

const NavButton = ({ onClick, href, icon, label, accent }) => {
  const styles = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 16px",
    height: "34px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.12s",
    border: accent
      ? "1px solid rgba(99,102,241,0.25)"
      : "1px solid rgba(255,255,255,0.08)",
    background: accent ? "rgba(99,102,241,0.08)" : "transparent",
    color: accent ? "#818CF8" : "rgba(255,255,255,0.4)",
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={styles}>
        <Icon as={icon} boxSize="13px" />
        {label}
      </a>
    );
  }

  return (
    <Flex
      align="center"
      gap={2}
      px={4}
      h="34px"
      borderRadius="8px"
      border={
        accent
          ? "1px solid rgba(99,102,241,0.25)"
          : "1px solid rgba(255,255,255,0.08)"
      }
      bg={accent ? "rgba(99,102,241,0.08)" : "transparent"}
      color={accent ? "#818CF8" : "rgba(255,255,255,0.4)"}
      fontSize="12px"
      fontWeight={600}
      cursor="pointer"
      transition="all 0.12s"
      _hover={{
        bg: accent ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
        borderColor: accent ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.15)",
        color: accent ? "#A5B4FC" : "rgba(255,255,255,0.7)",
      }}
      onClick={onClick}
    >
      <Icon as={icon} boxSize="13px" />
      {label}
    </Flex>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const About = () => {
  const [stats, setStats] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.get("/api/pstats");

        setStats(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/");
          return;
        }

        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
  }, [navigate]);

  const formatUptime = (up) => {
    if (!up) return "—";

    const days = Math.floor(up / 86400);
    const hours = Math.floor((up % 86400) / 3600);
    const minutes = Math.floor((up % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m`;
    }

    return `${Math.round(up)}s`;
  };

  const mb = (bytes) => {
    if (bytes === null || bytes === undefined) {
      return "—";
    }

    return `${(bytes / 1e6).toFixed(1)} MB`;
  };

  return (
    <Box minH="100%" bg="gray.800" py={10} px={4}>
      <Box maxW="480px" mx="auto">
        {/* Logo + title */}
        <Flex direction="column" align="center" mb={8} gap={3}>
          <Box
            w="48px"
            h="48px"
            borderRadius="13px"
            bg="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 0 28px rgba(99,102,241,0.3)"
          >
            <svg width="24" height="24" viewBox="0 0 12 12" fill="none">
              <rect
                x="1"
                y="1"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.9"
              />

              <rect
                x="7"
                y="1"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.5"
              />

              <rect
                x="1"
                y="7"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.5"
              />

              <rect
                x="7"
                y="7"
                width="4"
                height="4"
                rx="1"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </Box>

          <Box textAlign="center">
            <Text
              fontSize="22px"
              fontWeight="800"
              color="rgba(255,255,255,0.9)"
              letterSpacing="-0.03em"
              fontFamily="'JetBrains Mono', monospace"
            >
              uploady
            </Text>

            {stats?.version && (
              <Text
                fontSize="11px"
                color="rgba(255,255,255,0.25)"
                mt="2px"
                fontFamily="'JetBrains Mono', monospace"
              >
                {stats.version}
              </Text>
            )}
          </Box>
        </Flex>

        {/* Nav buttons */}
        <Flex gap={2} mb={5} justify="center">
          <NavButton
            icon={FiFolder}
            label="File Manager"
            accent
            onClick={() => navigate("/sftp")}
          />

          <NavButton
            icon={FiGithub}
            label="GitHub"
            href="https://github.com/JimMatthew/uploady"
          />
        </Flex>

        {/* Stats card */}
        <Box
          bg="rgba(255,255,255,0.02)"
          border="1px solid rgba(255,255,255,0.07)"
          borderRadius="12px"
          overflow="hidden"
        >
          {!stats ? (
            <Flex align="center" justify="center" gap={2} py={8}>
              <Spinner size="xs" color="rgba(99,102,241,0.5)" />

              <Text fontSize="12px" color="rgba(255,255,255,0.2)">
                Loading…
              </Text>
            </Flex>
          ) : (
            <>
              <SectionHeader icon={FiCpu} label="Runtime" />

              <StatRow label="Runtime" value={stats.runtime} accent="#818CF8" />

              <StatRow label="Runtime version" value={stats.runtimeVersion} />

              <StatRow label="JavaScript engine" value={stats.engine} />

              {stats.engineVersion && (
                <StatRow label="Engine version" value={stats.engineVersion} />
              )}

              <StatRow label="Architecture" value={stats.architecture} />

              <StatRow label="PID" value={stats.pid} />

              <StatRow
                label="Uptime"
                value={formatUptime(stats.uptime)}
                accent="#4ADE80"
              />

              <SectionHeader icon={FiServer} label="System" />

              <StatRow label="Hostname" value={stats.hostname} />

              <StatRow
                label="OS"
                value={
                  stats.osName && stats.osRelease
                    ? `${stats.osName} ${stats.osRelease}`
                    : stats.osName
                }
              />

              {stats.osVersion && (
                <StatRow label="OS version" value={stats.osVersion} />
              )}

              <StatRow label="Platform" value={stats.platform} />

              <SectionHeader icon={FiHardDrive} label="Memory" />

              <StatRow label="RSS" value={mb(stats.memory?.rss)} />

              <StatRow label="Heap total" value={mb(stats.memory?.heapTotal)} />

              <StatRow
                label="Heap used"
                value={mb(stats.memory?.heapUsed)}
                accent="#818CF8"
              />

              <StatRow label="External" value={mb(stats.memory?.external)} />

              <StatRow
                label="ArrayBuffers"
                value={mb(stats.memory?.arrayBuffers)}
              />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default About;
