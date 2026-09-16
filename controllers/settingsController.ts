import type { Request, Response } from "express";

import {
  getSettings as getSettingsService,
  UpdateSessionSettingsOptions,
  updateSessionSettings as updateSessionSettingsService,
} from "../services/settingsService";

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await getSettingsService();

    res.json(settings);
  } catch (error) {
    console.error("Failed to get settings:", error);

    res.status(500).json({
      error: "Failed to get settings",
    });
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
): Promise<void> {
  try {
    const options = parseUpdateSessionSettingsOptions(req.body);
    const settings = await updateSessionSettingsService(options);

    res.json(settings);
  } catch (error) {
    console.error("Failed to update session settings:", error);

    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to update session settings",
    });
  }
}
