import { lazy, Suspense } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

const SshConsole = lazy(() => import("./SshConsole"));

const SshPopout = () => {
  const params = new URLSearchParams(window.location.search);
  const serverId = params.get("serverId");
  const host = params.get("host");

  if (!serverId) {
    return (
      <Flex w="100%" h="100%" align="center" justify="center" bg="#0B0D12">
        <Text fontSize="12px" color="rgba(255,255,255,0.45)">
          Missing server ID.
        </Text>
      </Flex>
    );
  }

  return (
    <Box w="100%" h="100%" overflow="hidden">
      <Suspense fallback={null}>
        <SshConsole serverId={serverId} host={host} isPopout />
      </Suspense>
    </Box>
  );
};

export default SshPopout;
