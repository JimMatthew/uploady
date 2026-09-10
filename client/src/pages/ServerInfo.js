import { useEffect, useState } from "react";
import { Box, Flex, Text, Icon, Progress, Button } from "@chakra-ui/react";
import {
  FiServer,
  FiHardDrive,
  FiCpu,
  FiActivity,
  FiClock,
  FiPlay,
  FiSquare,
  FiRefreshCw,
} from "react-icons/fi";
import apiClient from "../services/apiClient";
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
  switch (service.state) {
    case "running":
      return "running";

    case "failed":
      return "failed";

    case "starting":
    case "stopping":
      return "transitioning";

    case "stopped":
      return "stopped";

    default:
      return "unknown";
  }
};

const getStateLabel = (service) => {
  switch (service.state) {
    case "running":
      return "Running";

    case "stopped":
      return "Stopped";

    case "failed":
      return "Failed";

    case "starting":
      return "Starting";

    case "stopping":
      return "Stopping";

    default:
      return "Unknown";
  }
};

const getStateColor = (service) => {
  switch (service.state) {
    case "running":
      return "#22C55E";

    case "failed":
      return "#EF4444";

    case "starting":
    case "stopping":
      return "#F59E0B";

    case "stopped":
      return "rgba(255,255,255,0.35)";

    default:
      return "rgba(255,255,255,0.22)";
  }
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

const ServiceRow = ({ service, onAction, pendingAction }) => {
  const isBusy = Boolean(pendingAction);
  const transitioning =
    service.state === "starting" || service.state === "stopping";

  return (
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
      <Box minW={0} flex={1}>
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

        {service.description && (
          <Text fontSize="11px" color="rgba(255,255,255,0.3)" mt="2px">
            {service.description}
          </Text>
        )}
      </Box>

      <Flex align="center" gap={3} flexShrink={0}>
        <Flex align="center" gap={2}>
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg={getStateColor(service)}
          />

          <Text
            fontSize="11px"
            fontWeight={600}
            color={getStateColor(service)}
            fontFamily="'JetBrains Mono', monospace"
          >
            {pendingAction
              ? pendingAction === "start"
                ? "Starting"
                : pendingAction === "stop"
                  ? "Stopping"
                  : "Restarting"
              : getStateLabel(service)}
          </Text>
        </Flex>

        <Flex align="center" gap={1}>
          {service.state !== "running" && (
            <Button
              size="xs"
              minW="28px"
              h="28px"
              px={2}
              variant="ghost"
              borderRadius="6px"
              color="rgba(34,197,94,0.7)"
              aria-label={`Start ${service.name}`}
              title="Start"
              isDisabled={isBusy || transitioning}
              onClick={() => onAction(service.name, "start")}
              _hover={{
                bg: "rgba(34,197,94,0.08)",
                color: "#22C55E",
              }}
            >
              <Icon as={FiPlay} boxSize="11px" />
            </Button>
          )}

          {service.state === "running" && (
            <>
              <Button
                size="xs"
                minW="28px"
                h="28px"
                px={2}
                variant="ghost"
                borderRadius="6px"
                color="rgba(245,158,11,0.7)"
                aria-label={`Restart ${service.name}`}
                title="Restart"
                isDisabled={isBusy || transitioning}
                onClick={() => onAction(service.name, "restart")}
                _hover={{
                  bg: "rgba(245,158,11,0.08)",
                  color: "#F59E0B",
                }}
              >
                <Icon as={FiRefreshCw} boxSize="11px" />
              </Button>

              <Button
                size="xs"
                minW="28px"
                h="28px"
                px={2}
                variant="ghost"
                borderRadius="6px"
                color="rgba(239,68,68,0.65)"
                aria-label={`Stop ${service.name}`}
                title="Stop"
                isDisabled={isBusy || transitioning}
                onClick={() => onAction(service.name, "stop")}
                _hover={{
                  bg: "rgba(239,68,68,0.08)",
                  color: "#EF4444",
                }}
              >
                <Icon as={FiSquare} boxSize="10px" />
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ServerInfo = ({ serverId, host }) => {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsUnavailable, setStatsUnavailable] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [publicKeyLoading, setPublicKeyLoading] = useState(true);
  const [serviceData, setServiceData] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesUnavailable, setServicesUnavailable] = useState(false);
  const [serviceActions, setServiceActions] = useState({});
  const [visibleStates, setVisibleStates] = useState(
    new Set(["running", "stopped", "failed", "transitioning", "unknown"]),
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

  const runServiceAction = async (serviceName, action) => {
    setServiceActions((current) => ({
      ...current,
      [serviceName]: action,
    }));

    try {
      await apiClient.post(
        `/sftp/server-services/${serverId}/services/${encodeURIComponent(
          serviceName,
        )}/${action}`,
      );

      const data = await apiClient.get(`/sftp/server-services/${serverId}`);

      setServiceData(data);
    } catch (err) {
      console.error(`Failed to ${action} service ${serviceName}:`, err);
    } finally {
      setServiceActions((current) => {
        const next = { ...current };

        delete next[serviceName];

        return next;
      });
    }
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
      stopped: 0,
      failed: 0,
      transitioning: 0,
      unknown: 0,
    },
  ) ?? {
    running: 0,
    stopped: 0,
    failed: 0,
    transitioning: 0,
    unknown: 0,
  };

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsUnavailable(false);

      try {
        const data = await apiClient.get(`/sftp/server-stats/${serverId}`);

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
        const data = await apiClient.get(`/sftp/server-services/${serverId}`);

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

    const fetchPublicKey = async () => {
      setPublicKeyLoading(true);

      try {
        const data = await apiClient.get(
          `/sftp/api/servers/${serverId}/public-key`,
        );

        if (!cancelled) {
          setPublicKey(data.publicKey ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load public key:", err);
          setPublicKey(null);
        }
      } finally {
        if (!cancelled) {
          setPublicKeyLoading(false);
        }
      }
    };

    fetchStats();
    fetchServices();
    fetchPublicKey();

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

      {/* SSH Public Key */}
      {!publicKeyLoading && publicKey && (
        <Box mt={6}>
          <Text
            fontSize="11px"
            fontWeight={600}
            color="rgba(255,255,255,0.35)"
            letterSpacing="0.06em"
            textTransform="uppercase"
            mb={3}
          >
            SSH Public Key
          </Text>

          <Box
            p={4}
            bg="rgba(255,255,255,0.02)"
            border="1px solid rgba(255,255,255,0.07)"
            borderRadius="10px"
          >
            <Text
              fontSize="11px"
              color="rgba(255,255,255,0.55)"
              fontFamily="'JetBrains Mono', monospace"
              wordBreak="break-all"
              lineHeight={1.7}
            >
              {publicKey}
            </Text>
          </Box>
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
                key: "stopped",
                label: "Stopped",
              },
              {
                key: "failed",
                label: "Failed",
              },
              {
                key: "transitioning",
                label: "Starting / Stopping",
              },
              {
                key: "unknown",
                label: "Unknown",
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
              <ServiceRow
                key={service.name}
                service={service}
                onAction={runServiceAction}
                pendingAction={serviceActions[service.name] ?? null}
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ServerInfo;
