import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Icon,
  Progress,
} from "@chakra-ui/react";
import {
  FiServer,
  FiHardDrive,
  FiCpu,
  FiActivity,
  FiClock,
} from "react-icons/fi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatBytes = (gb) => {
  if (gb === undefined || gb === null) return "—";

  return gb >= 1
    ? `${gb.toFixed(1)} GB`
    : `${(gb * 1024).toFixed(0)} MB`;
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

const StatCard = ({
  icon,
  label,
  value,
  children,
}) => (
  <Box
    p={4}
    bg="rgba(255,255,255,0.02)"
    border="1px solid rgba(255,255,255,0.07)"
    borderRadius="10px"
  >
    <Flex align="center" gap={2} mb={3}>
      <Icon
        as={icon}
        boxSize="13px"
        color="rgba(99,102,241,0.75)"
      />

      <Text
        fontSize="11px"
        fontWeight={600}
        color="rgba(255,255,255,0.35)"
        letterSpacing="0.06em"
        textTransform="uppercase"
      >
        {label}
      </Text>
    </Flex>

    {children ?? (
      <Text
        fontSize="18px"
        fontWeight={600}
        color="rgba(255,255,255,0.85)"
        fontFamily="'JetBrains Mono', monospace"
      >
        {value}
      </Text>
    )}
  </Box>
);

const DiskUsage = ({
  used,
  total,
}) => {
  if (
    used === undefined ||
    used === null ||
    total === undefined ||
    total === null
  ) {
    return (
      <Text
        fontSize="18px"
        color="rgba(255,255,255,0.5)"
        fontFamily="'JetBrains Mono', monospace"
      >
        —
      </Text>
    );
  }

  const pct = Math.round((used / total) * 100);
  const color =
    pct > 90
      ? "#EF4444"
      : pct > 70
        ? "#F59E0B"
        : "#22C55E";

  return (
    <Box>
      <Flex
        align="baseline"
        justify="space-between"
        mb={2}
      >
        <Text
          fontSize="18px"
          fontWeight={600}
          color="rgba(255,255,255,0.85)"
          fontFamily="'JetBrains Mono', monospace"
        >
          {pct}%
        </Text>

        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.35)"
          fontFamily="'JetBrains Mono', monospace"
        >
          {formatBytes(used)} / {formatBytes(total)}
        </Text>
      </Flex>

      <Progress
        value={pct}
        size="xs"
        borderRadius="full"
        bg="rgba(255,255,255,0.06)"
        sx={{
          "& > div": {
            background: color,
            borderRadius: "full",
          },
        }}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ServerInfo = ({
  serverId,
  host,
}) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setUnavailable(false);

      try {
        const response = await fetch(
          `/sftp/server-stats/${serverId}`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load server stats");
        }

        const data = await response.json();

        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to load server stats:",
            err,
          );

          setUnavailable(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [serverId]);

  return (
    <Box
      maxW="900px"
      w="100%"
      mx="auto"
      px={6}
      pb={6}
    >
      {/* Header */}
      <Flex
        align="center"
        gap={3}
        mb={5}
        pt={4}
      >
        <Box
          w="36px"
          h="36px"
          borderRadius="9px"
          bg="rgba(99,102,241,0.15)"
          border="1px solid rgba(99,102,241,0.25)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon
            as={FiServer}
            boxSize="16px"
            color="#818CF8"
          />
        </Box>

        <Box>
          <Text
            fontSize="16px"
            fontWeight={700}
            color="rgba(255,255,255,0.9)"
            letterSpacing="-0.02em"
            lineHeight={1.2}
          >
            {host}
          </Text>

          <Text
            fontSize="12px"
            color="rgba(255,255,255,0.28)"
            mt="1px"
          >
            Server information
          </Text>
        </Box>
      </Flex>

      {loading ? (
        <Flex
          align="center"
          gap={2}
          p={4}
          bg="rgba(255,255,255,0.02)"
          border="1px solid rgba(255,255,255,0.07)"
          borderRadius="10px"
        >
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="rgba(255,255,255,0.2)"
            animation="pulse 1.5s infinite"
          />

          <Text
            fontSize="12px"
            color="rgba(255,255,255,0.3)"
            fontFamily="'JetBrains Mono', monospace"
          >
            Loading server information…
          </Text>
        </Flex>
      ) : unavailable || !stats ? (
        <Box
          p={4}
          bg="rgba(255,255,255,0.02)"
          border="1px solid rgba(255,255,255,0.07)"
          borderRadius="10px"
        >
          <Text
            fontSize="12px"
            color="rgba(255,255,255,0.3)"
            fontFamily="'JetBrains Mono', monospace"
          >
            Server information unavailable
          </Text>
        </Box>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
          }}
          gap={3}
        >
          <StatCard
            icon={FiCpu}
            label="CPU"
            value={
              stats.cpu !== undefined &&
              stats.cpu !== null
                ? `${stats.cpu}%`
                : "—"
            }
          />

          <StatCard
            icon={FiActivity}
            label="Memory"
            value={
              stats.memory !== undefined &&
              stats.memory !== null
                ? `${stats.memory}%`
                : "—"
            }
          />

          <StatCard
            icon={FiClock}
            label="Uptime"
            value={formatUptime(
              stats.uptimeSeconds,
            )}
          />

          <StatCard
            icon={FiHardDrive}
            label="Disk"
          >
            <DiskUsage
              used={stats.disk?.usedGb}
              total={stats.disk?.totalGb}
            />
          </StatCard>
        </Box>
      )}
    </Box>
  );
};

export default ServerInfo;