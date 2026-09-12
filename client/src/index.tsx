import React from "react";
import ReactDOM from "react-dom/client";
import {
  ChakraProvider,
  ColorModeScript,
  extendTheme,
} from "@chakra-ui/react";

import "./index.css";

import App from "./App";
import { ClipboardProvider } from "./contexts/ClipboardContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.800" : "gray.50",
        color: props.colorMode === "dark" ? "white" : "black",
      },
    }),
  },
});

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ClipboardProvider>
        <ColorModeScript
          initialColorMode={theme.config.initialColorMode}
        />
        <App />
      </ClipboardProvider>
    </ChakraProvider>
  </React.StrictMode>,
);

