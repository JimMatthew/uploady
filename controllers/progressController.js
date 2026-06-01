const { addClient, removeClient } = require("../services/progressService");
const executor = require("../services/transferExecutor");
/**
 * SSE endpoint for transfer job progress.
 * Subscribes to executor events for the given jobId.
 * Sends a catch-up snapshot if the job is already running.
 *
 * Protocol:
 *   Server → { ready: true }
 *   Server → { type: 'jobStart', totalFiles }
 *   Server → { type: 'fileStart', file, size }
 *   Server → { type: 'fileProgress', file, percent }
 *   Server → { type: 'fileDone', file, completed, total }
 *   Server → { type: 'fileFail', file, error }
 *   Server → { type: 'jobDone', completed, failed, status }
 */
function get_transfer_progress(req, res) {
  const { transferId: jobId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (payload) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  send({ ready: true });

  // catch-up snapshot if job is already running
  const job = executor.getJob(jobId);
  if (job) {
    send({
      type: "jobStart",
      totalFiles: job.totalFiles,
      completedFiles: job.completedFiles,
      failedFiles: job.failedFiles,
      currentFile: job.currentFile,
      status: job.status,
      // send current item statuses so client can render partial progress
      items: [...job.items.values()].map((item) => ({
        filename: item.filename,
        status: item.status,
        percent: item.percent,
        error: item.error,
      })),
    });
  }

  // subscribe to executor events
  const events = [
    "jobStart",
    "fileStart",
    "fileProgress",
    "fileDone",
    "fileFail",
    "jobDone",
  ];

  const handlers = {};
  for (const event of events) {
    handlers[event] = (data) => send({ type: event, ...data });
    executor.on(`${event}:${jobId}`, handlers[event]);
  }

  // cleanup on disconnect
  req.on("close", () => {
    for (const event of events) {
      executor.removeListener(`${event}:${jobId}`, handlers[event]);
    }
  });
}

module.exports = { get_transfer_progress };
