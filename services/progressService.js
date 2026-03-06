/**
 * In-memory SSE client registry.
 * Maps transferId → Express response object.
 * Each transfer opens one SSE connection which stays open until
 * complete() is called or the client disconnects.
 * @type {Map<string, import('express').Response>}
 */
const progressClients = new Map();

/**
 * Registers an SSE client response for a given transfer.
 * Should be called immediately after the SSE headers are sent.
 * @param {string} transferId
 * @param {import('express').Response} res
 */
function addClient(transferId, res) {
  progressClients.set(transferId, res);
}

/**
 * Removes a client from the registry without closing the connection.
 * Called when the client disconnects via the request close event.
 * Safe to call even if the transferId no longer exists.
 * @param {string} transferId
 */
function removeClient(transferId) {
  progressClients.delete(transferId);
}

/**
 * Sends a progress event to the SSE client for the given transfer.
 * Payload is serialised as a JSON SSE data frame.
 * No-ops silently if the transferId has no registered client.
 * @param {string} transferId
 * @param {{ file?: string, percent?: string, done?: boolean, indeterminate?: boolean }} payload
 */
function sendProgress(transferId, payload) {
  const client = progressClients.get(transferId);
  if (!client || client.writableEnded) return;
  client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Sends the final allDone event, closes the SSE connection, and removes
 * the client from the registry.
 * Safe to call even if the transferId has no registered client — this
 * can happen if the browser disconnected before the transfer finished.
 * @param {string} transferId
 */
function complete(transferId) {
  const client = progressClients.get(transferId);
  if (!client) {
    console.warn(`complete() called for unknown transferId: ${transferId}`);
    return;
  }
  if (!client.writableEnded) {
    client.write(`data: ${JSON.stringify({ allDone: true })}\n\n`);
    client.end();
  }
  progressClients.delete(transferId);
}

module.exports = { addClient, removeClient, sendProgress, complete };
