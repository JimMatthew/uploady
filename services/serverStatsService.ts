import type { Request, Response } from "express";
import { getServerOptions } from "./serverService";
import { sshExec } from "../infrastructure/ssh/sshExec";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiskStats {
  usedGb: number;
  totalGb: number;
}

export interface ServerStats {
  disk: DiskStats | null;
  cpu: number | null;
  memory: number | null;
  uptimeSeconds: number | null;
}

interface CpuStat {
  idle: number;
  total: number;
}

interface ServerStatsParams {
  serverId: string;
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Parses `df -k /` output into used/total GB.
 */
function parseDisk(output: string): DiskStats | null {
  const line = output.trim().split("\n")[1];

  if (!line) {
    return null;
  }

  const parts = line.trim().split(/\s+/);
  const totalKb = Number.parseInt(parts[1], 10);
  const usedKb = Number.parseInt(parts[2], 10);

  if (Number.isNaN(totalKb) || Number.isNaN(usedKb)) {
    return null;
  }

  return {
    usedGb: Number((usedKb / 1024 / 1024).toFixed(2)),
    totalGb: Number((totalKb / 1024 / 1024).toFixed(2)),
  };
}

/**
 * Parses two successive /proc/stat reads to compute CPU usage percentage.
 */
function parseCpu(stat1: string, stat2: string): number | null {
  const parse = (stat: string): CpuStat | null => {
    const line = stat.split("\n")[0];

    if (!line) {
      return null;
    }

    const nums = line
      .replace(/^cpu\s+/, "")
      .trim()
      .split(/\s+/)
      .map(Number);

    if (nums.length < 4 || nums.some(Number.isNaN)) {
      return null;
    }

    const idle = nums[3] + (nums[4] ?? 0);

    const total = nums.reduce((sum, value) => sum + value, 0);

    return {
      idle,
      total,
    };
  };

  const a = parse(stat1);
  const b = parse(stat2);

  if (!a || !b) {
    return null;
  }

  const totalDiff = b.total - a.total;

  const idleDiff = b.idle - a.idle;

  if (totalDiff <= 0) {
    return 0;
  }

  return Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
}

/**
 * Parses /proc/meminfo output into a usage percentage.
 */
function parseMemory(output: string): number | null {
  const getValue = (key: string): number | null => {
    const match = output.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));

    return match ? Number.parseInt(match[1], 10) : null;
  };

  const total = getValue("MemTotal");

  const available = getValue("MemAvailable") ?? getValue("MemFree");

  if (total === null || available === null || total <= 0) {
    return null;
  }

  return Math.round(((total - available) / total) * 100);
}

/**
 * Parses /proc/uptime into total seconds.
 */
function parseUptime(output: string): number | null {
  const seconds = Number.parseFloat(output.trim().split(" ")[0]);

  return Number.isNaN(seconds) ? null : Math.floor(seconds);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Fetches CPU, memory, disk, and uptime stats from a remote server via SSH.
 *
 * CPU is measured over a 500ms sample window for accuracy.
 */
async function getServerStats(serverId: string): Promise<ServerStats> {
  const connectConfig = await getServerOptions(serverId);

  const [cpuStat1, results] = await Promise.all([
    sshExec(connectConfig, "cat /proc/stat"),

    new Promise<string | null>((resolve) => {
      setTimeout(async () => {
        try {
          const output = await sshExec(
            connectConfig,
            [
              "cat /proc/stat",
              "echo '---'",
              "cat /proc/meminfo",
              "echo '---'",
              "cat /proc/uptime",
              "echo '---'",
              "df -k /",
            ].join(" && "),
          );

          resolve(output.stdout);
        } catch (err) {
          console.error(err);
          resolve(null);
        }
      }, 500);
    }),
  ]);

  if (!results) {
    return {
      disk: null,
      cpu: null,
      memory: null,
      uptimeSeconds: null,
    };
  }

  const [cpuStat2Raw, memRaw, uptimeRaw, diskRaw] = results.split("---\n");

  return {
    cpu: cpuStat2Raw ? parseCpu(cpuStat1.stdout, cpuStat2Raw) : null,
    memory: memRaw ? parseMemory(memRaw) : null,
    uptimeSeconds: uptimeRaw ? parseUptime(uptimeRaw) : null,
    disk: diskRaw ? parseDisk(diskRaw) : null,
  };
}

// ---------------------------------------------------------------------------
// HTTP Handler
// ---------------------------------------------------------------------------

export async function getServerStatsHandler(
  req: Request<ServerStatsParams>,
  res: Response,
): Promise<void> {
  const { serverId } = req.params;

  if (!serverId) {
    res.status(400).json({
      error: "Missing serverId",
    });
    return;
  }

  try {
    const stats = await getServerStats(serverId);

    res.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    console.error(`Stats fetch failed for server ${serverId}:`, message);

    res.status(500).json({
      error: "Failed to retrieve server stats",
    });
  }
}
