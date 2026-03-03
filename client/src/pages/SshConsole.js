import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import "xterm/css/xterm.css";
import "../xterm.css";
import { Box, Flex, Text, Icon } from "@chakra-ui/react";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from "@xterm/addon-fit";
import { FiTerminal } from "react-icons/fi";

const SshConsole = ({ serverId, host }) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const [isInit, init] = useState(false);
  const [connected, setConnected] = useState(false);
  const isHttps = window.location.protocol === "https:";

  useEffect(() => {
    term.current = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        cursor: "#528bff",
        black: "#1c1c1c",
        red: "#e06c75",
        green: "#98c379",
        yellow: "#e5c07b",
        blue: "#61afef",
        magenta: "#c678dd",
        cyan: "#56b6c2",
        white: "#dcdfe4",
      },
    });

    const fitAddon = new FitAddon();
    term.current.loadAddon(fitAddon);
    const terminalContainer = document.getElementById("terminal");
    term.current.open(terminalRef.current);
    term.current.loadAddon(new WebglAddon());

    const wsProtocol = isHttps ? "wss" : "ws";
    const socket = new WebSocket(`${wsProtocol}://${window.location.hostname}:3001/ssh`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ event: "startSession", serverId }));
    };

    fitAddon.fit();

    const handleResize = () => {
      if (!init) return;
      fitAddon.fit();
      socket.send(JSON.stringify({
        event: "resize",
        rows: term.current.rows,
        cols: term.current.cols,
      }));
    };

    window.addEventListener("resize", handleResize);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === "output") {
        if (!connected) setConnected(true);
        term.current.write(message.data);
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
    };

    term.current.onData((data) => {
      if (!isInit) {
        init(true);
        handleResize();
      }
      socket.send(JSON.stringify({ event: "input", data }));
    });

    return () => {
      socket.close();
    };
  }, [serverId]);

  return (
    <Box>
      {/* Toolbar — 40px tall, so offset below is 200px + 40px = 240px */}
      <Flex
        align="center"
        gap={3}
        px={4}
        h="40px"
        bg="rgba(8,8,12,0.9)"
        borderBottom="1px solid rgba(255,255,255,0.07)"
      >
        {/* Traffic lights */}
        <Flex gap="6px" align="center">
          <Box w="10px" h="10px" borderRadius="full" bg="rgba(239,68,68,0.5)" />
          <Box w="10px" h="10px" borderRadius="full" bg="rgba(251,191,36,0.5)" />
          <Box w="10px" h="10px" borderRadius="full" bg="rgba(34,197,94,0.5)" />
        </Flex>

        <Box w="1px" h="16px" bg="rgba(255,255,255,0.07)" />

        <Icon as={FiTerminal} boxSize="12px" color="rgba(255,255,255,0.3)" />
        {host && (
          <Text fontSize="12px" fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.45)" letterSpacing="-0.01em">
            {host}
          </Text>
        )}

        <Box flex={1} />

        {/* Connection status */}
        <Flex align="center" gap={2}>
          <Box
            w="6px" h="6px" borderRadius="full"
            bg={connected ? "#22C55E" : "rgba(255,255,255,0.2)"}
            boxShadow={connected ? "0 0 6px rgba(34,197,94,0.6)" : "none"}
            transition="all 0.3s"
          />
          <Text fontSize="10px" letterSpacing="0.04em" transition="color 0.3s"
            color={connected ? "#4ADE80" : "rgba(255,255,255,0.3)"}>
            {connected ? "connected" : "connecting…"}
          </Text>
        </Flex>
      </Flex>

      {/* Terminal — original working layout, just +40px for the toolbar */}
      <Box
        ref={terminalRef}
        id="terminal"
        h="calc(100vh - 240px)"
        bg="gray.900"
        overflow="hidden"
      />
    </Box>
  );
};

export default SshConsole;