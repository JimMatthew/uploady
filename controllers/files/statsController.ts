import os from "node:os";
import { execSync } from "node:child_process";
import type { Request, Response } from "express";
import { getErrorMessage } from "../helpers/requestHelpers";

interface PerformanceStats {
  runtime: string;
  runtimeVersion: string;
  engine: string;
  engineVersion: string | null;

  database: string;
  databaseServer: string | null;

  memory: NodeJS.MemoryUsage | null;
  cpu: NodeJS.CpuUsage | null;
  uptime: number | null;

  pid: number;
  architecture: string;
  platform: NodeJS.Platform;

  osName: string | null;
  osRelease: string | null;
  osVersion: string | null;
  hostname: string | null;

  version: string | null;
}

/**
 * Returns runtime, process, system, database, and current git commit information.
 */
export function get_performance_stats(_req: Request, res: Response): void {
  const isBun = typeof process.versions.bun === "string";

  const databaseType = process.env.DATABASE_TYPE || "mongo";

  const stats: PerformanceStats = {
    runtime: isBun ? "Bun" : "Node.js",
    runtimeVersion: isBun ? process.versions.bun! : process.version,
    engine: isBun ? "JavaScriptCore" : "V8",
    engineVersion: isBun ? null : (process.versions.v8 ?? null),
    database: databaseType,
    databaseServer: null,
    memory: null,
    cpu: null,
    uptime: null,
    pid: process.pid,
    architecture: process.arch,
    platform: process.platform,
    osName: null,
    osRelease: null,
    osVersion: null,
    hostname: null,
    version: null,
  };

  try {
    stats.memory = process.memoryUsage();
  } catch (error) {
    console.warn("Failed to get memory usage:", getErrorMessage(error));
  }

  try {
    stats.cpu = process.cpuUsage();
  } catch (error) {
    console.warn("Failed to get CPU usage:", getErrorMessage(error));
  }

  try {
    stats.uptime = process.uptime();
  } catch (error) {
    console.warn("Failed to get process uptime:", getErrorMessage(error));
  }

  try {
    stats.osName = os.type();
    stats.osRelease = os.release();
    stats.osVersion = os.version();
    stats.hostname = os.hostname();
  } catch (error) {
    console.warn("Failed to get OS information:", getErrorMessage(error));
  }

  if (databaseType === "mongo" && process.env.DATABASE) {
    try {
      const mongoUrl = new URL(process.env.DATABASE);
      stats.databaseServer = mongoUrl.hostname;
    } catch (error) {
      console.warn("Failed to parse MongoDB server:", getErrorMessage(error));
    }
  }

  try {
    stats.version = execSync("git rev-parse --short HEAD").toString().trim();
  } catch (error) {
    console.warn("Failed to get Git version:", getErrorMessage(error));
  }

  res.json(stats);
}
