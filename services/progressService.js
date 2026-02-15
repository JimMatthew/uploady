const progressClients = new Map(); // Map<transferId, res>

function addClient(transferId, res) {
  progressClients.set(transferId, res);
}

function removeClient(transferId) {
  progressClients.delete(transferId);
}

function sendProgress(transferId, payload) {
  const client = progressClients.get(transferId);
  if (client) {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

function complete(transferId) {
  const client = progressClients.get(transferId);
  if (client) {
    client.write(`data: ${JSON.stringify({ allDone: true })}\n\n`);
    client.end();
    progressClients.delete(transferId);
  }
}

module.exports = { addClient, removeClient, sendProgress, complete };