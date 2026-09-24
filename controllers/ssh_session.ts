import { Client } from "ssh2";
import type { WebSocket, RawData } from "ws";

import { getServerOptions } from "../services/serverService";
import { logger } from "../logging";
// ─── Helpers ──────────────────────────────────────────────────────────────────
const log = logger.child("SSH");

type ServerEvent =
  | "connected"
  | "shellReady"
  | "shellError"
  | "output"
  | "closed"
  | "connectionError";

function sendJson(
  socket: WebSocket,
  event: ServerEvent,
  data: string | null,
): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(
      JSON.stringify({
        event,
        data,
      }),
    );
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ─── Client Messages ──────────────────────────────────────────────────────────

interface StartSessionMessage {
  event: "startSession";
  serverId: string;
}

interface InputMessage {
  event: "input";
  data: string;
}

interface ResizeMessage {
  event: "resize";
  rows: number;
  cols: number;
}

type ClientMessage = StartSessionMessage | InputMessage | ResizeMessage;

function parseMessage(raw: RawData): ClientMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw.toString());

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const message = parsed as Record<string, unknown>;

    if (
      message.event === "startSession" &&
      typeof message.serverId === "string" &&
      message.serverId
    ) {
      return {
        event: "startSession",
        serverId: message.serverId,
      };
    }

    if (message.event === "input" && typeof message.data === "string") {
      return {
        event: "input",
        data: message.data,
      };
    }

    if (
      message.event === "resize" &&
      typeof message.rows === "number" &&
      Number.isFinite(message.rows) &&
      message.rows > 0 &&
      typeof message.cols === "number" &&
      Number.isFinite(message.cols) &&
      message.cols > 0
    ) {
      return {
        event: "resize",
        rows: message.rows,
        cols: message.cols,
      };
    }

    return null;
  } catch {
    log.error("Recieved malformed WebSocket message");
    return null;
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Handles a WebSocket connection as an interactive SSH session.
 *
 * Protocol:
 *   Client → { event: "startSession", serverId: string }
 *   Client → { event: "input", data: string }
 *   Client → { event: "resize", rows: number, cols: number }
 *
 *   Server → { event: "output", data: string }
 *
 * A single socket handles exactly one SSH session. Opening a second
 * startSession event on the same socket is ignored.
 */
export default function ssh_session(socket: WebSocket): void {
  const sshClient = new Client();

  let sessionStarted = false;

  // ── Initial handshake listener ──────────────────────────────────────────────

  const onStartMessage = async (raw: RawData): Promise<void> => {
    const message = parseMessage(raw);

    if (!message || message.event !== "startSession") {
      return;
    }

    if (sessionStarted) {
      return;
    }

    sessionStarted = true;

    // Replace startup listener with the shell I/O listener once session begins.
    socket.off("message", onStartMessage);

    try {
      const connectConfig = await getServerOptions(message.serverId);

      sshClient
        .on("ready", () => {
          sendJson(socket, "connected", null);

          sshClient.shell(
            {
              term: "xterm-256color",
            },
            (error, stream) => {
              if (error) {
                sendJson(socket, "shellError", error.message);

                return;
              }

              sendJson(socket, "shellReady", null);

              // ── Shell I/O ────────────────────────────────────────────────

              stream.on("data", (data: Buffer) => {
                sendJson(socket, "output", data.toString());
              });

              stream.on("close", () => {
                sendJson(socket, "closed", null);

                sshClient.end();
              });

              // ── Input / resize from client ───────────────────────────────

              socket.on("message", (raw: RawData) => {
                const message = parseMessage(raw);

                if (!message) {
                  return;
                }

                switch (message.event) {
                  case "resize":
                    stream.setWindow(message.rows, message.cols, 0, 0);
                    break;

                  case "input":
                    stream.write(message.data);
                    break;

                  case "startSession":
                    break;
                }
              });
            },
          );
        })
        .on("error", (error: Error) => {
          log.error("Connection error", { error })
          
          sendJson(socket, "connectionError", error.message);
        })
        .connect(connectConfig);
    } catch (error) {
      log.error("Failed to get server options", { error });
      sendJson(socket, "connectionError", getErrorMessage(error));
    }
  };

  socket.on("message", onStartMessage);

  // ── Cleanup on disconnect ──────────────────────────────────────────────────

  socket.on("close", () => {
    try {
      sshClient.end();
    } catch {
      // Client may not have connected — safe to ignore.
    }
  });
}
