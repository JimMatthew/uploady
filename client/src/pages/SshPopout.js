import { lazy, Suspense } from "react";
import { Box } from "@chakra-ui/react";

const SshConsole = lazy(() => import("./SshConsole"));

const SshPopout = () => {
  const params = new URLSearchParams(window.location.search);

  const serverId = params.get("serverId");

  const host = params.get("host");

  return (
    <Box w="100%" h="100%" overflow="hidden">
      <Suspense fallback={null}>
        <SshConsole serverId={serverId} host={host} isPopout />
      </Suspense>
    </Box>
  );
};

export default SshPopout;
