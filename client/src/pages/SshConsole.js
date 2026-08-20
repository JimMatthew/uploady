import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import "xterm/css/xterm.css";
import "../xterm.css";

import { Box, Flex, Text, Icon } from "@chakra-ui/react";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from "@xterm/addon-fit";

import { FiTerminal, FiExternalLink, FiRefreshCw } from "react-icons/fi";

const SshConsole = ({ serverId, host, isPopout = false }) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);
  const socketRef = useRef(null);
  const isInit = useRef(false);

  const [connState, setConnState] = useState("connecting");
  const [reconnectKey, setReconnectKey] = useState(0);

  const isHttps = window.location.protocol === "https:";

  const handlePopOut = () => {
    const params = new URLSearchParams({
      serverId,
      host: host ?? "",
    });

    window.open(
      `/ssh-popout?${params.toString()}`,
      `ssh-${serverId}`,
      "width=1000,height=700,resizable=yes,scrollbars=no",
    );
  };

  const handleReconnect = () => {
    setReconnectKey((key) => key + 1);
  };

  useEffect(() => {
    isInit.current = false;
    setConnState("connecting");

    // ─── Terminal Setup ─────────────────────────────────────────────────────

    term.current = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",

      theme: {
        background: "#0D0D12",
        foreground: "#e0e0e0",

        cursor: "#6366F1",
        cursorAccent: "#0D0D12",

        selectionBackground: "rgba(99,102,241,0.3)",

        black: "#1c1c1c",
        red: "#e06c75",
        green: "#98c379",
        yellow: "#e5c07b",
        blue: "#61afef",
        magenta: "#c678dd",
        cyan: "#56b6c2",
        white: "#dcdfe4",

        brightBlack: "#4b5263",
        brightRed: "#e06c75",
        brightGreen: "#98c379",
        brightYellow: "#e5c07b",
        brightBlue: "#61afef",
        brightMagenta: "#c678dd",
        brightCyan: "#56b6c2",
        brightWhite: "#ffffff",
      },
    });

    fitAddon.current = new FitAddon();

    term.current.loadAddon(fitAddon.current);
    term.current.open(terminalRef.current);

    try {
      term.current.loadAddon(new WebglAddon());
    } catch {
      // WebGL unavailable. xterm will use its fallback renderer.
    }

    // ─── WebSocket ──────────────────────────────────────────────────────────

    const wsProtocol = isHttps ? "wss" : "ws";

    const socket = new WebSocket(`${wsProtocol}://${window.location.host}/ssh`);

    socketRef.current = socket;

    // ─── Helpers ────────────────────────────────────────────────────────────

    const sendResize = () => {
      if (!term.current || !fitAddon.current) {
        return;
      }

      fitAddon.current.fit();

      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      socket.send(
        JSON.stringify({
          event: "resize",
          rows: term.current.rows,
          cols: term.current.cols,
        }),
      );
    };

    // ─── Socket Events ──────────────────────────────────────────────────────

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          event: "startSession",
          serverId,
        }),
      );
    };

    socket.onmessage = (event) => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch (err) {
        console.error("SshConsole: failed to parse WebSocket message", err);
        return;
      }

      switch (message.event) {
        case "connected":
          setConnState("connected");

          // Session is established, so make sure the remote PTY
          // gets the current terminal dimensions.
          requestAnimationFrame(() => {
            sendResize();
          });

          break;

        case "output":
          term.current?.write(message.data);
          break;

        case "connectionError":
          setConnState("error");

          term.current?.write(
            `\r\n\x1b[31m*** SSH CONNECTION ERROR: ${message.data} ***\x1b[0m\r\n`,
          );

          break;

        case "shellError":
          setConnState("error");

          term.current?.write(
            `\r\n\x1b[31m*** SSH SHELL ERROR: ${message.data} ***\x1b[0m\r\n`,
          );

          break;

        case "closed":
          setConnState("closed");

          term.current?.write(
            "\r\n\x1b[33m*** SSH SESSION CLOSED ***\x1b[0m\r\n",
          );

          break;

        default:
          break;
      }
    };

    socket.onerror = () => {
      setConnState("error");

      term.current?.write("\r\n\x1b[31mConnection error\x1b[0m\r\n");
    };

    socket.onclose = () => {
      setConnState("closed");

      term.current?.write("\r\n\x1b[33mSession closed\x1b[0m\r\n");
    };

    // ─── Input ──────────────────────────────────────────────────────────────

    const inputDisposable = term.current.onData((data) => {
      if (!isInit.current) {
        isInit.current = true;
        sendResize();
      }

      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      socket.send(
        JSON.stringify({
          event: "input",
          data,
        }),
      );
    });

    // ─── Window Resize ──────────────────────────────────────────────────────

    const handleResize = () => {
      sendResize();
    };

    fitAddon.current.fit();

    window.addEventListener("resize", handleResize);

    // ─── Cleanup ────────────────────────────────────────────────────────────

    return () => {
      window.removeEventListener("resize", handleResize);

      inputDisposable.dispose();

      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }

      term.current?.dispose();

      term.current = null;
      fitAddon.current = null;
      socketRef.current = null;
    };
  }, [serverId, reconnectKey, isHttps]);

  // ─── Connection Status ────────────────────────────────────────────────────

  const statusColor =
    connState === "connected"
      ? "#22C55E"
      : connState === "error"
        ? "#EF4444"
        : connState === "closed"
          ? "#F59E0B"
          : "rgba(255,255,255,0.2)";

  const statusTextColor =
    connState === "connected"
      ? "#4ADE80"
      : connState === "error"
        ? "#EF4444"
        : connState === "closed"
          ? "#F59E0B"
          : "rgba(255,255,255,0.3)";

  const statusLabel =
    connState === "connected"
      ? "connected"
      : connState === "error"
        ? "error"
        : connState === "closed"
          ? "closed"
          : "connecting…";

  const canReconnect = connState === "error" || connState === "closed";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box h="100%" display="flex" flexDirection="column" bg="#0D0D12">
      {/* Toolbar */}
      <Flex
        align="center"
        gap={3}
        px={4}
        h="40px"
        flexShrink={0}
        bg="rgba(8,8,12,0.95)"
        borderBottom="1px solid rgba(255,255,255,0.07)"
      >
        {/* Connection status */}
        <Flex align="center" gap={2}>
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            transition="all 0.3s"
            bg={statusColor}
            boxShadow={
              connState === "connected"
                ? "0 0 6px rgba(34,197,94,0.6)"
                : connState === "error"
                  ? "0 0 6px rgba(239,68,68,0.6)"
                  : "none"
            }
            animation={
              connState === "connecting"
                ? "pulse 1.5s infinite"
                : connState === "connected"
                  ? "pulse 2s infinite"
                  : "none"
            }
          />

          <Text
            fontSize="10px"
            letterSpacing="0.04em"
            transition="color 0.3s"
            color={statusTextColor}
          >
            {statusLabel}
          </Text>
        </Flex>

        {/* Reconnect */}
        {canReconnect && (
          <Box
            as="button"
            onClick={handleReconnect}
            display="flex"
            alignItems="center"
            gap="4px"
            px="6px"
            h="22px"
            borderRadius="md"
            fontSize="10px"
            letterSpacing="0.02em"
            color="rgba(255,255,255,0.5)"
            _hover={{
              color: "white",
              bg: "rgba(255,255,255,0.08)",
            }}
            title="Reconnect SSH session"
            aria-label="Reconnect SSH session"
          >
            <FiRefreshCw size={11} />
            reconnect
          </Box>
        )}

        <Box w="1px" h="16px" bg="rgba(255,255,255,0.07)" />

        {/* Terminal icon + host */}
        <Icon as={FiTerminal} boxSize="13px" color="rgba(255,255,255,0.4)" />

        {host && (
          <Text
            fontSize="12px"
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.45)"
            letterSpacing="-0.01em"
          >
            {host}
          </Text>
        )}

        <Box flex={1} />

        {/* Pop-out */}
        {!isPopout && (
          <Box
            as="button"
            onClick={handlePopOut}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="28px"
            h="28px"
            borderRadius="md"
            color="rgba(255,255,255,0.45)"
            _hover={{
              color: "white",
              bg: "rgba(255,255,255,0.08)",
            }}
            title="Pop out terminal"
            aria-label="Pop out terminal"
          >
            <FiExternalLink size={14} />
          </Box>
        )}
      </Flex>

      <Box ref={terminalRef} flex={1} overflow="hidden" p={1} />
    </Box>
  );
};

export default SshConsole;
