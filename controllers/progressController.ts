import type { Request, Response } from "express";
import { transferExecutor } from "../services/transferExecutor";

const TRANSFER_EVENTS = [
  "jobStart",
  "fileStart",
  "rootProgress",
  "fileDone",
  "fileFail",
  "jobDone",
] as const;

type TransferEvent = (typeof TRANSFER_EVENTS)[number];

/**
 * SSE endpoint for transfer job progress.
 * Subscribes to executor events for the given jobId.
 * Sends a catch-up snapshot if the job is already running.
 *
 * Protocol:
 *   Server → { ready: true }
 *   Server → { type: 'jobStart', roots, totalFiles, completedFiles,
 *              failedFiles, currentFile, status }
 *   Server → { type: 'fileStart', file, size }
 *   Server → { type: 'rootProgress', ... }
 *   Server → { type: 'fileDone', file, completed, total }
 *   Server → { type: 'fileFail', file, error }
 *   Server → { type: 'jobDone', completed, failed, status }
 */
export function get_transfer_progress(req: Request, res: Response): void {
  const { transferId: jobId } = req.params;

  if (typeof jobId !== "string") {
    res.status(400).json({
      error: "Invalid transfer ID",
    });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (payload: object): void => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  send({ ready: true });

  // Catch-up snapshot if job is already running.
  const job = transferExecutor.getJob(jobId);

  if (job) {
    send({
      type: "jobStart",
      roots: [...job.roots.values()],
      totalFiles: job.totalFiles,
      completedFiles: job.completedFiles,
      failedFiles: job.failedFiles,
      currentFile: job.currentFile,
      status: job.status,
    });
  }

  const handlers: Partial<Record<TransferEvent, (data: object) => void>> = {};

  for (const event of TRANSFER_EVENTS) {
    const handler = (data: object): void => {
      send({
        type: event,
        ...data,
      });
    };

    handlers[event] = handler;
    transferExecutor.on(`${event}:${jobId}`, handler);
  }

  // Cleanup on disconnect.
  req.on("close", () => {
    for (const event of TRANSFER_EVENTS) {
      const handler = handlers[event];

      if (handler) {
        transferExecutor.removeListener(`${event}:${jobId}`, handler);
      }
    }
  });
}
