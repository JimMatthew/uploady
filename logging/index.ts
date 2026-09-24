import { AppLogger } from "./logger";
import type { LogLevel } from "./types";

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();

  switch (level) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return level;

    default:
      return "info";
  }
}

/*
 * Shared application logger.
 *
 * Components should normally create a child logger so log records identify
 * the subsystem that produced them:
 *
 *   const log = logger.child("SERVICES");
 */
export const logger = new AppLogger(getLogLevel());

export type { Logger, LogContext, LogLevel, LogRecord } from "./types";
