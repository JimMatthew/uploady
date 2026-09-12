import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import {
  FiGithub,
  FiFolder,
  FiCpu,
  FiHardDrive,
  FiServer,
  FiDatabase,
} from "react-icons/fi";

import apiClient, { ApiError } from "../services/apiClient";

interface MemoryStats {
  rss?: number | null;
  heapTotal?: number | null;
  heapUsed?: number | null;
  external?: number | null;
  arrayBuffers?: number | null;
}

interface ProcessStats {
  version?: string | null;

  runtime?: string | null;
  runtimeVersion?: string | null;
  engine?: string | null;
  engineVersion?: string | null;
  architecture?: string | null;
  pid?: number | null;
  uptime?: number | null;

  database?: string | null;
  databaseServer?: string | null;

  hostname?: string | null;
  osName?: string | null;
  osRelease?: string | null;
  osVersion?: string | null;
  platform?: string | null;

  memory?: MemoryStats | null;
}

interface StatRowProps {
  label: string;
  value?: ReactNode;
  accent?: string;
}

interface SectionHeaderProps {
  icon: IconType;
  label: string;
}

interface NavButtonProps {
  onClick?: () => void;
  href?: string;
  icon: IconType;
  label: string;
  accent?: boolean;
}

const DATABASE_NAMES: Record<string, string> = {
  sqlite: "SQLite",
  mongo: "MongoDB",
};

const formatDatabase = (database?: string | null): string => {
  if (!database) {
    return "—";
  }

  return DATABASE_NAMES[database] ?? database;
};

const formatUptime = (seconds?: number | null): string => {
  if (seconds == null) {
    return "—";
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${Math.round(seconds)}s`;
};

const formatMegabytes = (bytes?: number | null): string => {
  if (bytes == null) {
    return "—";
  }

  return `${(bytes / 1e6).toFixed(1)} MB`;
};

const StatRow = ({ label, value, accent }: StatRowProps) => (
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
      color={accent ?? "rgba(255,255,255,0.75)"}
    >
      {value ?? "—"}
    </Text>
  </Flex>
);

const SectionHeader = ({ icon, label }: SectionHeaderProps) => (
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

const NavButton = ({
  onClick,
  href,
  icon,
  label,
  accent = false,
}: NavButtonProps) => {
  const commonProps = {
    align: "center",
    gap: 2,
    px: 4,
    h: "34px",
    borderRadius: "8px",
    border: "1px solid",
    borderColor: accent ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)",
    bg: accent ? "rgba(99,102,241,0.08)" : "transparent",
    color: accent ? "#818CF8" : "rgba(255,255,255,0.4)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.12s",
    _hover: {
      bg: accent ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
      borderColor: accent ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.15)",
      color: accent ? "#A5B4FC" : "rgba(255,255,255,0.7)",
      textDecoration: "none",
    },
  };

  if (href) {
    return (
      <Flex
        as="a"
        href={href}
        target="_blank"
        rel="noreferrer"
        {...commonProps}
      >
        <Icon as={icon} boxSize="13px" />
        {label}
      </Flex>
    );
  }

  return (
    <Flex {...commonProps} onClick={onClick}>
      <Icon as={icon} boxSize="13px" />
      {label}
    </Flex>
  );
};

const About = () => {
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [loadError, setLoadError] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        const data = await apiClient.get<ProcessStats>("/api/pstats");

        setStats(data);
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 401) {
          navigate("/");
          return;
        }

        console.error("Failed to fetch stats:", error);
        setLoadError(true);
      }
    };

    void fetchStats();
  }, [navigate]);

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
          {loadError ? (
            <Flex align="center" justify="center" py={8}>
              <Text fontSize="12px" color="rgba(239,68,68,0.65)">
                Failed to load system information
              </Text>
            </Flex>
          ) : !stats ? (
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

              <SectionHeader icon={FiDatabase} label="Database" />

              <StatRow
                label="Backend"
                value={formatDatabase(stats.database)}
                accent="#818CF8"
              />

              {stats.databaseServer && (
                <StatRow label="Server" value={stats.databaseServer} />
              )}

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

              <StatRow label="RSS" value={formatMegabytes(stats.memory?.rss)} />

              <StatRow
                label="Heap total"
                value={formatMegabytes(stats.memory?.heapTotal)}
              />

              <StatRow
                label="Heap used"
                value={formatMegabytes(stats.memory?.heapUsed)}
                accent="#818CF8"
              />

              <StatRow
                label="External"
                value={formatMegabytes(stats.memory?.external)}
              />

              <StatRow
                label="ArrayBuffers"
                value={formatMegabytes(stats.memory?.arrayBuffers)}
              />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default About;
