import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Box, Flex, Text, Icon, Spinner } from "@chakra-ui/react";
import { FiGithub, FiFolder, FiCpu, FiHardDrive, FiClock, FiCode } from "react-icons/fi";

const StatRow = ({ label, value, accent }) => (
  <Flex
    align="center"
    justify="space-between"
    px={4} py="10px"
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
      {value}
    </Text>
  </Flex>
);

const About = () => {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetch("/api/pstats", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).then((r) => {
      if (r.status === 401) { navigate("/"); return; }
      return r.json();
    }).then(setStats);
  }, []);

  const formatUptime = (up) => {
    if (!up) return "—";
    if (up < 60) return `${Math.round(up)}s`;
    if (up < 3600) return `${(up / 60).toFixed(1)}m`;
    return `${(up / 3600).toFixed(2)}h`;
  };

  const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;

  return (
    <Box minH="100vh" bg="#0A0A0E" py={10} px={4}>
      <Box maxW="480px" mx="auto">
        {/* Header */}
        <Flex direction="column" align="center" mb={8} gap={3}>
          <Box
            w="48px" h="48px" borderRadius="13px"
            bg="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
            display="flex" alignItems="center" justifyContent="center"
            boxShadow="0 0 28px rgba(99,102,241,0.3)"
          >
            <svg width="24" height="24" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9"/>
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9"/>
            </svg>
          </Box>
          <Box textAlign="center">
            <Text fontSize="22px" fontWeight="800" color="rgba(255,255,255,0.9)"
              letterSpacing="-0.03em" fontFamily="'JetBrains Mono', monospace">
              uploady
            </Text>
            {stats?.version && (
              <Text fontSize="11px" color="rgba(255,255,255,0.25)" mt="2px" fontFamily="'JetBrains Mono', monospace">
                v1.01 · {stats.version}
              </Text>
            )}
          </Box>
        </Flex>

        {/* Nav */}
        <Flex gap={2} mb={5} justify="center">
          <Link to="/app/files">
            <Flex align="center" gap={2} px={4} h="34px" borderRadius="8px"
              border="1px solid rgba(99,102,241,0.25)"
              bg="rgba(99,102,241,0.08)" color="#818CF8"
              fontSize="12px" fontWeight={600}
              transition="all 0.12s" cursor="pointer"
              _hover={{ bg: "rgba(99,102,241,0.15)" }}
            >
              <Icon as={FiFolder} boxSize="13px" />
              File Manager
            </Flex>
          </Link>
          <a href="https://github.com/JimMatthew/uploady" target="_blank" rel="noreferrer">
            <Flex align="center" gap={2} px={4} h="34px" borderRadius="8px"
              border="1px solid rgba(255,255,255,0.08)"
              color="rgba(255,255,255,0.4)"
              fontSize="12px" fontWeight={500}
              transition="all 0.12s" cursor="pointer"
              _hover={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
            >
              <Icon as={FiGithub} boxSize="13px" />
              GitHub
            </Flex>
          </a>
        </Flex>

        {/* Stats card */}
        <Box
          bg="rgba(255,255,255,0.02)"
          border="1px solid rgba(255,255,255,0.07)"
          borderRadius="12px"
          overflow="hidden"
        >
          {/* Section: Memory */}
          <Box px={4} py="10px" borderBottom="1px solid rgba(255,255,255,0.06)">
            <Flex align="center" gap={2}>
              <Icon as={FiHardDrive} boxSize="12px" color="rgba(255,255,255,0.25)" />
              <Text fontSize="10px" fontWeight="700" letterSpacing="0.1em"
                textTransform="uppercase" color="rgba(255,255,255,0.25)">
                Memory
              </Text>
            </Flex>
          </Box>

          {!stats ? (
            <Flex align="center" justify="center" gap={2} py={8}>
              <Spinner size="xs" color="rgba(99,102,241,0.5)" />
              <Text fontSize="12px" color="rgba(255,255,255,0.2)">Loading…</Text>
            </Flex>
          ) : (
            <>
              <StatRow label="RSS"         value={mb(stats.memory.rss)} />
              <StatRow label="Heap total"  value={mb(stats.memory.heapTotal)} />
              <StatRow label="Heap used"   value={mb(stats.memory.heapUsed)} accent="#818CF8" />
              <StatRow label="External"    value={mb(stats.memory.external)} />
              <StatRow label="ArrayBuffers" value={mb(stats.memory.arrayBuffers)} />

              <Box px={4} py="10px"
                borderTop="1px solid rgba(255,255,255,0.06)"
                borderBottom="1px solid rgba(255,255,255,0.06)"
                mt={1}
              >
                <Flex align="center" gap={2}>
                  <Icon as={FiCpu} boxSize="12px" color="rgba(255,255,255,0.25)" />
                  <Text fontSize="10px" fontWeight="700" letterSpacing="0.1em"
                    textTransform="uppercase" color="rgba(255,255,255,0.25)">
                    Environment
                  </Text>
                </Flex>
              </Box>

              <StatRow label="Node"    value={stats.nodeVersion} />
              <StatRow label="V8"      value={stats.v8Version} />
              <StatRow label="OS"      value={`${stats.osName} ${stats.osRelease}`} />
              <StatRow label="Uptime"  value={formatUptime(stats.uptime)} accent="#4ADE80" />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default About;