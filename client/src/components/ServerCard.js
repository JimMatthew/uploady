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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatBytes = (gb) => {
  if (gb === undefined || gb === null) return "—";
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
};

const formatUptime = (seconds) => {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ActionBtn = ({ icon, label, color, hoverBg, onClick }) => (
  <Tooltip label={label} hasArrow openDelay={400}>
    <Flex
      w="28px"
      h="28px"
      align="center"
      justify="center"
      borderRadius="6px"
      cursor="pointer"
      color={color || "rgba(255,255,255,0.35)"}
      transition="all 0.12s"
      _hover={{
        bg: hoverBg || "rgba(255,255,255,0.07)",
        color: color || "rgba(255,255,255,0.8)",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Icon as={icon} boxSize="14px" />
    </Flex>
  </Tooltip>
);

const StatRow = ({ icon, label, value, children }) => (
  <Flex align="center" gap={2}>
    <Icon
      as={icon}
      boxSize="11px"
      color="rgba(255,255,255,0.2)"
      flexShrink={0}
    />
    <Text
      fontSize="11px"
      color="rgba(255,255,255,0.35)"
      fontFamily="'JetBrains Mono', monospace"
      w="52px"
      flexShrink={0}
    >
      {label}
    </Text>
    {children ?? (
      <Text
        fontSize="11px"
        color="rgba(255,255,255,0.65)"
        fontFamily="'JetBrains Mono', monospace"
      >
        {value}
      </Text>
    )}
  </Flex>
);

const DiskBar = ({ used, total }) => {
  if (!used || !total)
    return (
      <Text
        fontSize="11px"
        color="rgba(255,255,255,0.65)"
        fontFamily="'JetBrains Mono', monospace"
      >
        —
      </Text>
    );
  const pct = Math.round((used / total) * 100);
  const color = pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#22C55E";
  return (
    <Flex align="center" gap={2} flex={1}>
      <Progress
        value={pct}
        size="xs"
        flex={1}
        borderRadius="full"
        bg="rgba(255,255,255,0.06)"
        sx={{ "& > div": { background: color, borderRadius: "full" } }}
      />
      <Text
        fontSize="11px"
        color="rgba(255,255,255,0.5)"
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
  handleConnect,
  handleSshLaunch,
  handleServerInfoLaunch,
  deleteServer,
}) {
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const status = serverStatuses[serverId];
  const isOnline = status === "online";
  const isLoading = !status;

  // Fetch stats when expanded and online
  useEffect(() => {
    if (!expanded || !isOnline) return;

    let cancelled = false;
    setStatsLoading(true);

    fetch(`/sftp/server-stats/${serverId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setStatsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expanded, isOnline, serverId]);

  return (
    <Box
      px={3}
      py="10px"
      borderRadius="8px"
      border="1px solid"
      borderColor={
        expanded ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"
      }
      bg={expanded ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)"}
      transition="all 0.15s"
      role="group"
      _hover={{
        bg: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      {/* Header row — clickable to expand */}
      <Flex
        align="center"
        justify="space-between"
        mb="6px"
        cursor="pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Hostname */}
        <Text
          fontSize="12px"
          fontWeight={600}
          color="rgba(255,255,255,0.75)"
          fontFamily="'JetBrains Mono', monospace"
          noOfLines={1}
          maxW="130px"
          letterSpacing="-0.01em"
          _groupHover={{ color: "rgba(255,255,255,0.95)" }}
          transition="color 0.12s"
        >
          {serverName}
        </Text>

        <Flex align="center" gap={2}>
          {/* Status */}
          {isLoading ? (
            <Box
              w="6px"
              h="6px"
              borderRadius="full"
              bg="rgba(255,255,255,0.15)"
              animation="pulse 1.5s infinite"
            />
          ) : (
            <Flex align="center" gap={1}>
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={isOnline ? "#22C55E" : "#EF4444"}
                boxShadow={isOnline ? "0 0 6px rgba(34,197,94,0.6)" : "none"}
                animation={isOnline ? "pulse 2s infinite" : "none"}
              />
              <Text
                fontSize="10px"
                color={isOnline ? "#4ADE80" : "rgba(239,68,68,0.7)"}
                letterSpacing="0.04em"
              >
                {status}
              </Text>
            </Flex>
          )}

          {/* Expand chevron */}
          <Icon
            as={FiChevronDown}
            boxSize="12px"
            color="rgba(255,255,255,0.2)"
            transform={expanded ? "rotate(180deg)" : "rotate(0deg)"}
            transition="transform 0.2s"
          />
        </Flex>
      </Flex>

      {/* Actions */}
      <Flex gap={1}>
        <ActionBtn
          icon={FiFileText}
          label="SFTP"
          color="rgba(34,197,94,0.7)"
          hoverBg="rgba(34,197,94,0.1)"
          onClick={handleConnect}
        />
        <ActionBtn
          icon={FiTerminal}
          label="SSH"
          color="rgba(99,102,241,0.7)"
          hoverBg="rgba(99,102,241,0.1)"
          onClick={handleSshLaunch}
        />
          <ActionBtn
    icon={FiServer}
    label="Server Info"
    color="rgba(56,189,248,0.7)"
    hoverBg="rgba(56,189,248,0.1)"
    onClick={handleServerInfoLaunch}
  />
        <ActionBtn
          icon={FiTrash2}
          label="Delete"
          color="rgba(239,68,68,0.5)"
          hoverBg="rgba(239,68,68,0.1)"
          onClick={deleteServer}
        />
      </Flex>

      {/* Expanded stats panel */}
      {expanded && (
        <Box mt={3} pt={3} borderTop="1px solid rgba(255,255,255,0.06)">
          {!isOnline ? (
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.25)"
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
                bg="rgba(255,255,255,0.15)"
                animation="pulse 1.5s infinite"
              />
              <Text
                fontSize="11px"
                color="rgba(255,255,255,0.25)"
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
                value={stats.cpu ? `${stats.cpu}%` : "—"}
              />
              <StatRow
                icon={FiActivity}
                label="mem"
                value={stats.memory ? `${stats.memory}%` : "—"}
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
              color="rgba(255,255,255,0.25)"
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
