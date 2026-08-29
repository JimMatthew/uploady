import { useEffect, useState } from "react";
import { Box, Flex, Text, Icon, Progress, Button } from "@chakra-ui/react";
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

const getStateGroup = (service) => {
  if (service.state === "failed") {
    return "failed";
  }

  if (service.state === "active" && service.status === "running") {
    return "running";
  }

  if (service.state === "active") {
    return "active";
  }

  return "inactive";
};

const getStateLabel = (service) => {
  if (service.state === "failed") {
    return "Failed";
  }

  if (service.state === "active" && service.status === "running") {
    return "Running";
  }

  if (service.state === "active") {
    return "Active";
  }

  if (service.state === "inactive") {
    return "Inactive";
  }

  return service.state ?? service.status ?? "Unknown";
};

const getStateColor = (service) => {
  if (service.state === "failed") {
    return "#EF4444";
  }

  if (service.state === "active" && service.status === "running") {
    return "#22C55E";
  }

  if (service.state === "active") {
    return "#60A5FA";
  }

  return "rgba(255,255,255,0.35)";
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatCard = ({ icon, label, value, children }) => (
  <Box
    p={4}
    bg="rgba(255,255,255,0.02)"
    border="1px solid rgba(255,255,255,0.07)"
    borderRadius="10px"
  >
    <Flex align="center" gap={2} mb={3}>
      <Icon as={icon} boxSize="13px" color="rgba(99,102,241,0.75)" />

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

const DiskUsage = ({ used, total }) => {
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
  const color = pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#22C55E";

  return (
    <Box>
      <Flex align="baseline" justify="space-between" mb={2}>
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

const ServiceRow = ({ service }) => (
  <Flex
    align="center"
    justify="space-between"
    gap={4}
    px={4}
    py={3}
    borderBottom="1px solid rgba(255,255,255,0.05)"
    _last={{
      borderBottom: "none",
    }}
  >
    <Box minW={0}>
      <Text
        fontSize="12px"
        fontWeight={600}
        color="rgba(255,255,255,0.8)"
        fontFamily="'JetBrains Mono', monospace"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {service.name}
      </Text>

      <Text fontSize="11px" color="rgba(255,255,255,0.3)" mt="2px">
        {service.description}
      </Text>
    </Box>

    <Flex align="center" gap={2} flexShrink={0}>
      <Box w="6px" h="6px" borderRadius="full" bg={getStateColor(service)} />

      <Text
        fontSize="11px"
        fontWeight={600}
        color={getStateColor(service)}
        fontFamily="'JetBrains Mono', monospace"
      >
        {getStateLabel(service)}
      </Text>
    </Flex>
  </Flex>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ServerInfo = ({ serverId, host }) => {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsUnavailable, setStatsUnavailable] = useState(false);

  const [serviceData, setServiceData] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesUnavailable, setServicesUnavailable] = useState(false);

  const [visibleStates, setVisibleStates] = useState(
    new Set(["running", "active", "inactive", "failed"]),
  );

  const toggleState = (state) => {
    setVisibleStates((current) => {
      const next = new Set(current);

      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }

      return next;
    });
  };

  const filteredServices =
    serviceData?.services?.filter((service) =>
      visibleStates.has(getStateGroup(service)),
    ) ?? [];

  const serviceCounts = serviceData?.services?.reduce(
    (counts, service) => {
      const state = getStateGroup(service);

      counts[state]++;
      return counts;
    },
    {
      running: 0,
      active: 0,
      inactive: 0,
      failed: 0,
    },
  ) ?? {
    running: 0,
    active: 0,
    inactive: 0,
    failed: 0,
  };
  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsUnavailable(false);

      try {
        const response = await fetch(`/sftp/server-stats/${serverId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load server stats");
        }

        const data = await response.json();

        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load server stats:", err);

          setStatsUnavailable(true);
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    const fetchServices = async () => {
      setServicesLoading(true);
      setServicesUnavailable(false);

      try {
        const response = await fetch(`/sftp/server-services/${serverId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load server services");
        }

        const data = await response.json();

        if (!cancelled) {
          setServiceData(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load server services:", err);

          setServicesUnavailable(true);
        }
      } finally {
        if (!cancelled) {
          setServicesLoading(false);
        }
      }
    };

    fetchStats();
    fetchServices();

    return () => {
      cancelled = true;
    };
  }, [serverId]);

  return (
    <Box maxW="900px" w="100%" mx="auto" px={6} pb={6}>
      {/* Header */}
      <Flex align="center" gap={3} mb={5} pt={4}>
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
          <Icon as={FiServer} boxSize="16px" color="#818CF8" />
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

          <Text fontSize="12px" color="rgba(255,255,255,0.28)" mt="1px">
            Server information
          </Text>
        </Box>
      </Flex>

      {/* Stats */}
      {statsLoading ? (
        <Flex
          align="center"
          gap={2}
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
            Loading server information…
          </Text>
        </Flex>
      ) : statsUnavailable || !stats ? (
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
              stats.cpu !== undefined && stats.cpu !== null
                ? `${stats.cpu}%`
                : "—"
            }
          />

          <StatCard
            icon={FiActivity}
            label="Memory"
            value={
              stats.memory !== undefined && stats.memory !== null
                ? `${stats.memory}%`
                : "—"
            }
          />

          <StatCard
            icon={FiClock}
            label="Uptime"
            value={formatUptime(stats.uptimeSeconds)}
          />

          <StatCard icon={FiHardDrive} label="Disk">
            <DiskUsage used={stats.disk?.usedGb} total={stats.disk?.totalGb} />
          </StatCard>
        </Box>
      )}

      {/* Services */}
      <Box mt={6}>
        <Flex align="center" justify="space-between" mb={3}>
          <Text
            fontSize="11px"
            fontWeight={600}
            color="rgba(255,255,255,0.35)"
            letterSpacing="0.06em"
            textTransform="uppercase"
          >
            Services
          </Text>
          <Flex gap={2} mb={3} flexWrap="wrap">
            {[
              {
                key: "running",
                label: "Running",
              },
              {
                key: "active",
                label: "Active",
              },
              {
                key: "inactive",
                label: "Inactive",
              },
              {
                key: "failed",
                label: "Failed",
              },
            ].map(({ key, label }) => {
              const selected = visibleStates.has(key);

              return (
                <Button
                  key={key}
                  size="xs"
                  h="26px"
                  px={3}
                  borderRadius="6px"
                  fontSize="10px"
                  fontWeight={600}
                  fontFamily="'JetBrains Mono', monospace"
                  bg={
                    selected
                      ? "rgba(99,102,241,0.16)"
                      : "rgba(255,255,255,0.02)"
                  }
                  color={
                    selected
                      ? "rgba(165,180,252,0.9)"
                      : "rgba(255,255,255,0.25)"
                  }
                  border={
                    selected
                      ? "1px solid rgba(99,102,241,0.3)"
                      : "1px solid rgba(255,255,255,0.07)"
                  }
                  _hover={{
                    bg: selected
                      ? "rgba(99,102,241,0.22)"
                      : "rgba(255,255,255,0.05)",
                  }}
                  onClick={() => toggleState(key)}
                >
                  {label} {serviceCounts[key]}
                </Button>
              );
            })}
          </Flex>
          {serviceData?.manager && (
            <Text
              fontSize="10px"
              color="rgba(255,255,255,0.22)"
              fontFamily="'JetBrains Mono', monospace"
            >
              {serviceData.manager}
            </Text>
          )}
        </Flex>

        <Box
          bg="rgba(255,255,255,0.02)"
          border="1px solid rgba(255,255,255,0.07)"
          borderRadius="10px"
          overflow="hidden"
        >
          {servicesLoading ? (
            <Box p={4}>
              <Text
                fontSize="12px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                Loading services…
              </Text>
            </Box>
          ) : servicesUnavailable ? (
            <Box p={4}>
              <Text
                fontSize="12px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                Services unavailable
              </Text>
            </Box>
          ) : serviceData?.supported === false ? (
            <Box p={4}>
              <Text
                fontSize="12px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                Service management is not supported on this server
              </Text>
            </Box>
          ) : !serviceData?.services?.length ? (
            <Box p={4}>
              <Text
                fontSize="12px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                No services found
              </Text>
            </Box>
          ) : filteredServices.length === 0 ? (
            <Box p={4}>
              <Text
                fontSize="12px"
                color="rgba(255,255,255,0.3)"
                fontFamily="'JetBrains Mono', monospace"
              >
                No services match the selected states
              </Text>
            </Box>
          ) : (
            filteredServices.map((service) => (
              <ServiceRow key={service.name} service={service} />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ServerInfo;
