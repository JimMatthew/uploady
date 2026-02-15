const { addClient, removeClient } = require("../services/progressService");

async function get_transfer_progress(req, res) {
  const { transferId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write("\n");
  addClient(transferId, res);
  res.write(`data: ${JSON.stringify({ ready: true })}\n\n`);

  req.on("close", () => removeClient(transferId));
}

module.exports = { get_transfer_progress };