const { Client } = require("ssh2");
const serverService = require("../services/serverService");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Serialises and sends a JSON event frame to the WebSocket client.
 * @param {import('ws')} socket
 * @param {string} event
 * @param {string} data
 */
const sendJson = (socket, event, data) => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ event, data }));
  }
};

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Handles a WebSocket connection as an interactive SSH session.
 * Protocol:
 *   Client → { event: "startSession", serverId: string }
 *   Client → { event: "input", data: string }
 *   Client → { event: "resize", rows: number, cols: number }
 *   Server → { event: "output", data: string }
 *
 * A single socket handles exactly one SSH session. Opening a second
 * startSession event on the same socket is ignored.
 * @param {import('ws')} socket
 */
const ssh_session = (socket) => {
  const sshClient = new Client();
  let sessionStarted = false;

  /**
   * Parses an incoming WebSocket message safely.
   * @param {Buffer|string} raw
   * @returns {object|null}
   */
  const parseMessage = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      console.error("ssh_session: malformed WebSocket message");
      return null;
    }
  };

  // ── Initial handshake listener ───────────────────────────────────────────

  const onStartMessage = async (raw) => {
    const msg = parseMessage(raw);
    if (!msg || msg.event !== "startSession") return;
    if (sessionStarted) return;
    sessionStarted = true;

    // Replace startup listener with the shell I/O listener once session begins
    socket.off("message", onStartMessage);

    try {
      const connectConfig = await serverService.getServerOptions(msg.serverId);

      sshClient
        .on("ready", () => {
         sendJson(socket, "connected", null);

          sshClient.shell({ term: "xterm-256color" }, (err, stream) => {
            if (err) {
              sendJson(socket, "shellError", err.message);
              return;
            }

            // ── Shell I/O ────────────────────────────────────────────────

            stream.on("data", (data) => {
              sendJson(socket, "output", data.toString());
            });

            stream.on("close", () => {
              sendJson(socket, "closed", null);
              sshClient.end();
            });

            // ── Input / resize from client ───────────────────────────────

            socket.on("message", (raw) => {
              const msg = parseMessage(raw);
              if (!msg) return;

              if (msg.event === "resize" && msg.rows && msg.cols) {
                stream.setWindow(msg.rows, msg.cols);
              } else if (msg.event === "input") {
                stream.write(msg.data);
              }
            });
          });
        })
        .on("error", (err) => {
          console.error("SSH connection error:", err.message);
          sendJson(socket, "connectionError", err.message);
        })
        .connect(connectConfig);
    } catch (err) {
      console.error("ssh_session: failed to get server options:", err.message);
      sendJson(socket, "connectionError", err.message);
    }
  };

  socket.on("message", onStartMessage);

  // ── Cleanup on disconnect ────────────────────────────────────────────────

  socket.on("close", () => {
    try {
      sshClient.end();
    } catch {
      // Client may not have connected — safe to ignore
    }
  });
};

module.exports = ssh_session;
