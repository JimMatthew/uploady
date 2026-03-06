const { addClient, removeClient } = require("../services/progressService");

/**
 * SSE endpoint for transfer progress updates.
 * Opens a persistent connection identified by transferId and immediately
 * sends a ready event so the client knows the channel is open before
 * firing the transfer request.
 *
 * Protocol:
 *   Server → { ready: true }                        — channel open
 *   Server → { file: string, percent: string }      — progress update
 *   Server → { file: string, done: true }           — file complete
 *   Server → { file: string, indeterminate: true }  — no byte-level progress available
 *   Server → { allDone: true }                      — transfer complete, connection closed
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function get_transfer_progress(req, res) {
  const { transferId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addClient(transferId, res);
  res.write(`data: ${JSON.stringify({ ready: true })}\n\n`);

  req.on("close", () => removeClient(transferId));
}

module.exports = { get_transfer_progress };