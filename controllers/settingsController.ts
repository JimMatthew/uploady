import type { NextFunction, Request, Response } from "express";

import {
  getSettings as getSettingsService,
  type UpdateSessionSettingsOptions,
  updateSessionSettings as updateSessionSettingsService,
  getCertificateInfo,
} from "../services/settingsService";

import { getErrorMessage, nextError } from "./helpers/requestHelpers";

export async function getSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await getSettingsService();

    res.json(settings);
  } catch (error) {
    next(error);
  }
}

function parseUpdateSessionSettingsOptions(
  body: unknown,
): UpdateSessionSettingsOptions {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const value = data.jwtLifetimeMinutes;

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("JWT lifetime must be a number greater than 0");
  }

  return {
    jwtLifetimeMinutes: value,
  };
}

export async function updateSessionSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let options: UpdateSessionSettingsOptions;

  try {
    options = parseUpdateSessionSettingsOptions(req.body);
  } catch (error) {
    nextError(next, getErrorMessage(error) || "Invalid request body", 400);
    return;
  }

  try {
    const settings = await updateSessionSettingsService(options);

    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function certificate_info_get(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const certificate = getCertificateInfo();

    res.status(200).json(certificate);
  } catch (error) {
    next(error);
  }
}
