import type { Request, Response } from "express";

import {
  listServices,
  startService,
  stopService,
  restartService,
} from "../services/serviceManagerService";

/**
 * GET /api/servers/:serverId/services
 *
 * Lists services reported by the server's supported service manager.
 */
export async function getServerServices(
  req: Request,
  res: Response,
): Promise<void> {
  const { serverId } = req.params;

  if (typeof serverId !== "string" || !serverId) {
    res.status(400).json({
      error: "Missing or invalid serverId",
    });
    return;
  }

  try {
    const result = await listServices(serverId);

    res.json(result);
  } catch (error) {
    console.error(
      `Service fetch failed for server ${serverId}:`,
      error instanceof Error ? error.message : error,
    );

    res.status(500).json({
      error: "Failed to retrieve server services",
    });
  }
}

/**
 * POST /api/servers/:serverId/services/:serviceName/start
 */
export async function startServerService(
  req: Request,
  res: Response,
): Promise<void> {
  const { serverId, serviceName } = req.params;

  if (
    typeof serverId !== "string" ||
    typeof serviceName !== "string" ||
    !serverId ||
    !serviceName
  ) {
    res.status(400).json({
      error: "Missing or invalid serverId or serviceName",
    });
    return;
  }

  try {
    const result = await startService(serverId, serviceName);

    res.json(result);
  } catch (error) {
    console.error(
      `Failed to start service ${serviceName} on server ${serverId}:`,
      error instanceof Error ? error.message : error,
    );

    res.status(500).json({
      error: "Failed to start service",
    });
  }
}

/**
 * POST /api/servers/:serverId/services/:serviceName/stop
 */
export async function stopServerService(
  req: Request,
  res: Response,
): Promise<void> {
  const { serverId, serviceName } = req.params;

  if (
    typeof serverId !== "string" ||
    typeof serviceName !== "string" ||
    !serverId ||
    !serviceName
  ) {
    res.status(400).json({
      error: "Missing or invalid serverId or serviceName",
    });
    return;
  }

  try {
    const result = await stopService(serverId, serviceName);

    res.json(result);
  } catch (error) {
    console.error(
      `Failed to stop service ${serviceName} on server ${serverId}:`,
      error instanceof Error ? error.message : error,
    );

    res.status(500).json({
      error: "Failed to stop service",
    });
  }
}

/**
 * POST /api/servers/:serverId/services/:serviceName/restart
 */
export async function restartServerService(
  req: Request,
  res: Response,
): Promise<void> {
  const { serverId, serviceName } = req.params;

  if (
    typeof serverId !== "string" ||
    typeof serviceName !== "string" ||
    !serverId ||
    !serviceName
  ) {
    res.status(400).json({
      error: "Missing or invalid serverId or serviceName",
    });
    return;
  }

  try {
    const result = await restartService(serverId, serviceName);

    res.json(result);
  } catch (error) {
    console.error(
      `Failed to restart service ${serviceName} on server ${serverId}:`,
      error instanceof Error ? error.message : error,
    );

    res.status(500).json({
      error: "Failed to restart service",
    });
  }
}
