import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from "@xterm/addon-fit";

import "@xterm/xterm/css/xterm.css";
import "../xterm.css";

import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FiExternalLink, FiRefreshCw, FiTerminal } from "react-icons/fi";

const TERMINAL_BACKGROUND = "#0B0D12";
const TOOLBAR_BACKGROUND = "#10131A";
const ACCENT = "#818CF8";

const CONNECTION_STATES = {
  connecting: {
    color: "rgba(255,255,255,0.25)",
    textColor: "rgba(255,255,255,0.4)",
    label: "Connecting…",
  },
  connected: {
    color: "#6FCF97",
    textColor: "#8DD9AB",
    label: "Connected",
  },
  error: {
    color: "#E57373",
    textColor: "#EF9A9A",
    label: "Error",
  },
  closed: {
    color: "#D6A85F",
    textColor: "#E2BE82",
    label: "Closed",
  },
};

const SshConsole = ({
  serverId,
  host,
  isPopout = false,
  initialCommand = null,
}) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);

  const isInit = useRef(false);
  const initialCommandSent = useRef(false);

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
    initialCommandSent.current = false;

    setConnState("connecting");

    // ─── Terminal Setup ─────────────────────────────────────────────────────

    term.current = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",

      theme: {
        background: TERMINAL_BACKGROUND,
        foreground: "#D7DAE0",

        cursor: ACCENT,
        cursorAccent: TERMINAL_BACKGROUND,

        selectionBackground: "rgba(129,140,248,0.24)",

        black: "#181A20",
        red: "#E06C75",
        green: "#8FCB8F",
        yellow: "#D9B86C",
        blue: "#6FA8DC",
        magenta: "#B98BD4",
        cyan: "#67B7C7",
        white: "#D7DAE0",

        brightBlack: "#5C6370",
        brightRed: "#F07C84",
        brightGreen: "#A6D89A",
        brightYellow: "#E5C87A",
        brightBlue: "#82B6E6",
        brightMagenta: "#C89BE0",
        brightCyan: "#7BC8D8",
        brightWhite: "#F4F5F7",
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

    const writeError = (message) => {
      term.current?.write(`\r\n\x1b[31m*** ${message} ***\x1b[0m\r\n`);
    };

    const writeWarning = (message) => {
      term.current?.write(`\r\n\x1b[33m*** ${message} ***\x1b[0m\r\n`);
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
          // receives the current terminal dimensions.
          requestAnimationFrame(() => {
            sendResize();
          });

          break;

        case "shellReady":
          if (
            initialCommand &&
            !initialCommandSent.current &&
            socket.readyState === WebSocket.OPEN
          ) {
            initialCommandSent.current = true;

            // Wait until the terminal has been laid out before fitting
            // and sending the initial command.
            requestAnimationFrame(() => {
              sendResize();

              socket.send(
                JSON.stringify({
                  event: "input",
                  data: `${initialCommand}\r`,
                }),
              );
            });
          }

          break;

        case "output":
          term.current?.write(message.data);
          break;

        case "connectionError":
          setConnState("error");

          writeError(`SSH CONNECTION ERROR: ${message.data}`);

          break;

        case "shellError":
          setConnState("error");

          writeError(`SSH SHELL ERROR: ${message.data}`);

          break;

        case "closed":
          setConnState("closed");

          writeWarning("SSH SESSION CLOSED");

          break;

        default:
          break;
      }
    };

    socket.onerror = () => {
      setConnState("error");

      writeError("CONNECTION ERROR");
    };

    socket.onclose = () => {
      setConnState("closed");

      writeWarning("SESSION CLOSED");
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

    fitAddon.current.fit();

    window.addEventListener("resize", sendResize);

    // ─── Cleanup ────────────────────────────────────────────────────────────

    return () => {
      window.removeEventListener("resize", sendResize);

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
    };
  }, [serverId, reconnectKey, isHttps, initialCommand]);

  // ─── Connection Status ────────────────────────────────────────────────────

  const status = CONNECTION_STATES[connState] ?? CONNECTION_STATES.connecting;
  const canReconnect = connState === "error" || connState === "closed";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      bg={TERMINAL_BACKGROUND}
    >
      <Flex
        align="center"
        gap={3}
        px={4}
        h="40px"
        flexShrink={0}
        bg={TOOLBAR_BACKGROUND}
        borderBottom="1px solid rgba(255,255,255,0.06)"
      >
        {/* Terminal identity */}

        <Flex align="center" gap={2} minW={0}>
          <Icon as={FiTerminal} boxSize="13px" flexShrink={0} color={ACCENT} />

          <Text
            fontSize="12px"
            fontWeight={500}
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.72)"
            letterSpacing="-0.01em"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {host || "SSH Terminal"}
          </Text>
        </Flex>

        <Box flex={1} />

        {/* Connection status */}

        <Flex align="center" gap={1.5} flexShrink={0}>
          <Box
            w="7px"
            h="7px"
            borderRadius="full"
            bg={status.color}
            transition="background 0.2s ease"
            boxShadow={
              connState === "connected" ? `0 0 5px ${status.color}` : "none"
            }
            animation={
              connState === "connecting" ? "pulse 1.5s infinite" : "none"
            }
          />

          <Text
            fontSize="10px"
            letterSpacing="0.03em"
            color={status.textColor}
            transition="color 0.2s ease"
          >
            {status.label}
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
            h="24px"
            flexShrink={0}
            borderRadius="5px"
            fontSize="10px"
            letterSpacing="0.02em"
            color="rgba(255,255,255,0.45)"
            transition="background 120ms ease, color 120ms ease"
            _hover={{
              color: "rgba(255,255,255,0.85)",
              bg: "rgba(255,255,255,0.06)",
            }}
            _active={{
              bg: "rgba(255,255,255,0.09)",
            }}
            title="Reconnect SSH session"
            aria-label="Reconnect SSH session"
          >
            <FiRefreshCw size={11} />
            reconnect
          </Box>
        )}

        {/* Separator */}

        {!isPopout && (
          <Box w="1px" h="16px" flexShrink={0} bg="rgba(255,255,255,0.06)" />
        )}

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
            flexShrink={0}
            borderRadius="6px"
            color="rgba(255,255,255,0.4)"
            transition="background 120ms ease, color 120ms ease"
            _hover={{
              color: "rgba(255,255,255,0.85)",
              bg: "rgba(255,255,255,0.06)",
            }}
            _active={{
              bg: "rgba(255,255,255,0.09)",
            }}
            title="Pop out terminal"
            aria-label="Pop out terminal"
          >
            <FiExternalLink size={14} />
          </Box>
        )}
      </Flex>

      <Box ref={terminalRef} flex={1} minH={0} overflow="hidden" p={1} />
    </Box>
  );
};

export default SshConsole;
