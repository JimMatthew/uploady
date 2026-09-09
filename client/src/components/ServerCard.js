import { useState, useEffect } from "react";
import { Text, Box, Flex, Tooltip, Icon, Progress } from "@chakra-ui/react";

import {
  FiFileText,
  FiTerminal,
  FiTrash2,
  FiChevronDown,
  FiHardDrive,
  FiCpu,
  FiActivity,
  FiClock,
  FiServer,
} from "react-icons/fi";

import apiClient from "../services/apiClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatBytes = (gb) => {
  if (gb == null) return "—";

  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
};

const formatUptime = (seconds) => {
  if (seconds == null) return "—";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ActionButton = ({
  icon,
  label,
  color,
  bg,
  borderColor,
  hoverBg,
  hoverBorderColor,
  onClick,
}) => (
  <Tooltip label={label} hasArrow openDelay={400}>
    <Flex
      w="30px"
      h="30px"
      align="center"
      justify="center"
      borderRadius="7px"
      cursor="pointer"
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      color={color}
      transition="
        background 120ms ease,
        border-color 120ms ease,
        color 120ms ease,
        transform 120ms ease
      "
      _hover={{
        bg: hoverBg,
        borderColor: hoverBorderColor,
        transform: "translateY(-1px)",
      }}
      _active={{
        transform: "translateY(0)",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <Icon as={icon} boxSize="13px" />
    </Flex>
  </Tooltip>
);

const StatRow = ({ icon, label, value, children }) => (
  <Flex align="center" gap={2} minH="18px">
    <Icon
      as={icon}
      boxSize="11px"
      color="rgba(255,255,255,0.24)"
      flexShrink={0}
    />

    <Text
      w="52px"
      flexShrink={0}
      fontSize="10px"
      fontWeight={500}
      color="rgba(255,255,255,0.34)"
      fontFamily="'JetBrains Mono', monospace"
    >
      {label}
    </Text>

    {children ?? (
      <Text
        fontSize="11px"
        color="rgba(255,255,255,0.68)"
        fontFamily="'JetBrains Mono', monospace"
      >
        {value}
      </Text>
    )}
  </Flex>
);

const DiskBar = ({ used, total }) => {
  if (used == null || total == null || total === 0) {
    return (
      <Text
        fontSize="11px"
        color="rgba(255,255,255,0.65)"
        fontFamily="'JetBrains Mono', monospace"
      >
        —
      </Text>
    );
  }

  const percent = Math.round((used / total) * 100);

  const color = percent > 90 ? "#E57373" : percent > 70 ? "#D6A85F" : "#6FCF97";

  return (
    <Flex align="center" gap={2} flex={1} minW={0}>
      <Progress
        value={percent}
        size="xs"
        flex={1}
        borderRadius="full"
        bg="rgba(255,255,255,0.06)"
        sx={{
          "& > div": {
            background: color,
            borderRadius: "full",
          },
        }}
      />

      <Text
        fontSize="10px"
        color="rgba(255,255,255,0.48)"
        fontFamily="'JetBrains Mono', monospace"
        flexShrink={0}
      >
        {formatBytes(used)}/{formatBytes(total)}
      </Text>
    </Flex>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ServerCard({
  serverId,
  serverName,
  serverStatuses,
  onConnect,
  onSsh,
  onServerInfo,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);

  const [stats, setStats] = useState(null);

  const [statsLoading, setStatsLoading] = useState(false);

  const status = serverStatuses[serverId];
  const isOnline = status === "online";
  const isLoading = !status;

  useEffect(() => {
    if (!expanded || !isOnline) {
      return;
    }

    let cancelled = false;

    const fetchStats = async () => {
      setStatsLoading(true);

      try {
        const data = await apiClient.get(`/sftp/server-stats/${serverId}`);

        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`Failed to load stats for server ${serverId}:`, err);

          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [expanded, isOnline, serverId]);

  return (
    <Box
      px={3}
      py="10px"
      borderRadius="9px"
      border="1px solid"
      borderColor={
        expanded ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.065)"
      }
      bg={expanded ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)"}
      boxShadow={expanded ? "0 4px 14px rgba(0,0,0,0.12)" : "none"}
      transition="
        background 150ms ease,
        border-color 150ms ease,
        box-shadow 150ms ease
      "
      role="group"
      _hover={{
        bg: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.105)",
      }}
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        mb="8px"
        cursor="pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Text
          minW={0}
          maxW="140px"
          noOfLines={1}
          fontSize="12px"
          fontWeight={600}
          color="rgba(255,255,255,0.78)"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="-0.01em"
          transition="color 120ms ease"
          _groupHover={{
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {serverName}
        </Text>

        <Flex align="center" gap={2} flexShrink={0}>
          {isLoading ? (
            <Flex align="center" gap="5px">
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg="rgba(255,255,255,0.18)"
                animation="pulse 1.5s infinite"
              />

              <Text
                fontSize="9px"
                color="rgba(255,255,255,0.28)"
                letterSpacing="0.04em"
              >
                checking
              </Text>
            </Flex>
          ) : (
            <Flex align="center" gap="5px">
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={isOnline ? "#6FCF97" : "#E57373"}
                boxShadow={
                  isOnline ? "0 0 0 2px rgba(111,207,151,0.08)" : "none"
                }
              />

              <Text
                fontSize="9px"
                fontWeight={500}
                color={
                  isOnline ? "rgba(111,207,151,0.82)" : "rgba(229,115,115,0.75)"
                }
                letterSpacing="0.04em"
                textTransform="capitalize"
              >
                {status}
              </Text>
            </Flex>
          )}

          <Icon
            as={FiChevronDown}
            boxSize="12px"
            color="rgba(255,255,255,0.24)"
            transform={expanded ? "rotate(180deg)" : "rotate(0deg)"}
            transition="transform 180ms ease"
          />
        </Flex>
      </Flex>

      {/* Actions */}
      <Flex gap="5px">
        <ActionButton
          icon={FiFileText}
          label="SFTP"
          color="#7FD6A1"
          bg="rgba(111,207,151,0.075)"
          borderColor="rgba(111,207,151,0.14)"
          hoverBg="rgba(111,207,151,0.14)"
          hoverBorderColor="rgba(111,207,151,0.28)"
          onClick={onConnect}
        />

        <ActionButton
          icon={FiTerminal}
          label="SSH"
          color="#A5B4FC"
          bg="rgba(129,140,248,0.08)"
          borderColor="rgba(129,140,248,0.15)"
          hoverBg="rgba(129,140,248,0.15)"
          hoverBorderColor="rgba(129,140,248,0.3)"
          onClick={onSsh}
        />

        <ActionButton
          icon={FiServer}
          label="Server Info"
          color="#7BC8D8"
          bg="rgba(103,183,199,0.08)"
          borderColor="rgba(103,183,199,0.15)"
          hoverBg="rgba(103,183,199,0.15)"
          hoverBorderColor="rgba(103,183,199,0.3)"
          onClick={onServerInfo}
        />

        <Box flex={1} />

        <ActionButton
          icon={FiTrash2}
          label="Delete"
          color="rgba(229,115,115,0.62)"
          bg="rgba(229,115,115,0.035)"
          borderColor="rgba(229,115,115,0.08)"
          hoverBg="rgba(229,115,115,0.11)"
          hoverBorderColor="rgba(229,115,115,0.26)"
          onClick={onDelete}
        />
      </Flex>

      {/* Expanded stats */}
      {expanded && (
        <Box
          mt={3}
          pt={3}
          borderTop="1px solid"
          borderColor="rgba(255,255,255,0.06)"
        >
          {!isOnline ? (
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.28)"
              fontFamily="'JetBrains Mono', monospace"
            >
              Server is offline
            </Text>
          ) : statsLoading ? (
            <Flex gap={2} align="center">
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg="rgba(255,255,255,0.18)"
                animation="pulse 1.5s infinite"
              />

              <Text
                fontSize="11px"
                color="rgba(255,255,255,0.28)"
                fontFamily="'JetBrains Mono', monospace"
              >
                Loading stats…
              </Text>
            </Flex>
          ) : stats ? (
            <Flex direction="column" gap={2}>
              <StatRow icon={FiHardDrive} label="disk">
                <DiskBar
                  used={stats.disk?.usedGb}
                  total={stats.disk?.totalGb}
                />
              </StatRow>

              <StatRow
                icon={FiCpu}
                label="cpu"
                value={stats.cpu != null ? `${stats.cpu}%` : "—"}
              />

              <StatRow
                icon={FiActivity}
                label="mem"
                value={stats.memory != null ? `${stats.memory}%` : "—"}
              />

              <StatRow
                icon={FiClock}
                label="uptime"
                value={formatUptime(stats.uptimeSeconds)}
              />
            </Flex>
          ) : (
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.28)"
              fontFamily="'JetBrains Mono', monospace"
            >
              Stats unavailable
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
