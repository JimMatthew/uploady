import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import "xterm/css/xterm.css";
import "../xterm.css";
import { Box, Button } from "@chakra-ui/react";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from "@xterm/addon-fit";
const SshConsole = ({ serverId }) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const [isInit, init] = useState(false);
  const isHttps = window.location.protocol === "https:";

  useEffect(() => {
    term.current = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        //background: '#282c34', // Dark background
        //foreground: '#abb2bf', // Light gray text #abb2bf
        cursor: "#528bff", // Blue cursor
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
    const socket = new WebSocket(
      `${wsProtocol}://${window.location.hostname}:3001/ssh`
    );

    socket.onopen = () => {
      socket.send(JSON.stringify({ event: "startSession", serverId }));
    };

    fitAddon.fit();

    const handleResize = () => {
      if (!init) return;
      fitAddon.fit();

      socket.send(
        JSON.stringify({
          event: "resize",
          rows: term.current.rows,
          cols: term.current.cols,
        })
      );
    };

    window.addEventListener("resize", handleResize);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === "output") {
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
      <Box
        ref={terminalRef}
        id="terminal"
        h="920px"
        bg="gray.900"
        overflow="hidden"
      />
    </Box>
  );
};

export default SshConsole;
