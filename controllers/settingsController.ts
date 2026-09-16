import type { Request, Response } from "express";

import {
  getSettings as getSettingsService,
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

export async function updateSessionSettings(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const settings = await updateSessionSettingsService({
      jwtLifetimeMinutes: req.body.jwtLifetimeMinutes,
    });

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
