import React from "react";
import { Box } from "@chakra-ui/react";
import SshConsole from "./SshConsole";

const SshPopout = () => {
  const params = new URLSearchParams(window.location.search);

  const serverId = params.get("serverId");
  const host = params.get("host");

  return (
    <Box w="100vw" h="100%" overflow="hidden">
      <SshConsole serverId={serverId} host={host} isPopout />
    </Box>
  );
};

export default SshPopout;
