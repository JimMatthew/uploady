import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import "xterm/css/xterm.css";
import "../xterm.css";
import { Box } from "@chakra-ui/react";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from '@xterm/addon-fit';
const SshConsole = ({ serverId }) => {
  const terminalRef = useRef(null);
  const term = useRef(null);

  useEffect(() => {
    term.current = new Terminal({
      cols: 100,
      rows: 50,
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

    const socket = new WebSocket(`ws://192.168.1.119:3001/ssh`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ event: "startSession", serverId }));
    };
    //term.current.resize(110, 50);
    fitAddon.fit();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === "output") {
        term.current.write(message.data);
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
    };

    term.current.onData((data) => {
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
