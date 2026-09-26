import type { NextFunction, Request, Response } from "express";

import {
  listServices,
  startService,
  stopService,
  restartService,
} from "../services/serviceManagerService";

import { getStringParam, nextError } from "./helpers/requestHelpers";

/**
 * GET /api/servers/:serverId/services
 *
 * Lists services reported by the server's supported service manager.
 */
export async function getServerServices(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    nextError(next, "Missing or invalid serverId", 400);
    return;
  }

  try {
    const result = await listServices(serverId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/servers/:serverId/services/:serviceName/start
 */
export async function startServerService(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");
  const serviceName = getStringParam(req, "serviceName");

  if (!serverId || !serviceName) {
    nextError(next, "Missing or invalid serverId or serviceName", 400);
    return;
  }

  try {
    const result = await startService(serverId, serviceName);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/servers/:serverId/services/:serviceName/stop
 */
export async function stopServerService(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");
  const serviceName = getStringParam(req, "serviceName");

  if (!serverId || !serviceName) {
    nextError(next, "Missing or invalid serverId or serviceName", 400);
    return;
  }

  try {
    const result = await stopService(serverId, serviceName);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/servers/:serverId/services/:serviceName/restart
 */
export async function restartServerService(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");
  const serviceName = getStringParam(req, "serviceName");

  if (!serverId || !serviceName) {
    nextError(next, "Missing or invalid serverId or serviceName", 400);
    return;
  }

  try {
    const result = await restartService(serverId, serviceName);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
