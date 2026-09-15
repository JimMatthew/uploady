import type { ConnectConfig } from "ssh2";
import type { SshExecResult } from "../ssh/sshExec";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceState =
  "running" | "stopped" | "starting" | "stopping" | "failed" | "unknown";

export type ServiceAction = "start" | "stop" | "restart";

export interface ServiceInfo {
  name: string;
  state: ServiceState;
  status: string;
  description: string | null;
}

export type SshExec = (
  connectConfig: ConnectConfig,
  command: string,
) => Promise<SshExecResult>;

// ─── Service Listing ──────────────────────────────────────────────────────────

export async function listServices(
  connectConfig: ConnectConfig,
  sshExec: SshExec,
): Promise<ServiceInfo[]> {
  const result = await sshExec(
    connectConfig,
    [
      "systemctl",
      "list-units",
      "--type=service",
      "--all",
      "--no-legend",
      "--no-pager",
      "--plain",
    ].join(" "),
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `systemctl failed with exit code ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }

  return parseServices(result.stdout);
}

// ─── State Normalization ──────────────────────────────────────────────────────

function normalizeState(activeState: string, subState: string): ServiceState {
  if (activeState === "failed") {
    return "failed";
  }

  if (activeState === "activating") {
    return "starting";
  }

  if (activeState === "deactivating") {
    return "stopping";
  }

  if (activeState === "active") {
    return "running";
  }

  if (activeState === "inactive") {
    return "stopped";
  }

  return "unknown";
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseServices(output: string): ServiceInfo[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): ServiceInfo | null => {
      const parts = line.split(/\s+/);

      if (parts.length < 5) {
        return null;
      }

      const activeState = parts[2];

      const subState = parts[3];

      return {
        name: parts[0],
        state: normalizeState(activeState, subState),
        status: subState,
        description: parts.slice(4).join(" "),
      };
    })
    .filter((service): service is ServiceInfo => service !== null);
}

// ─── Service Control ──────────────────────────────────────────────────────────

async function runServiceCommand(
  connectConfig: ConnectConfig,
  serviceName: string,
  action: ServiceAction,
  sshExec: SshExec,
): Promise<void> {
  const result = await sshExec(
    connectConfig,
    `systemctl ${action} ${serviceName}`,
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `systemctl ${action} failed for ${serviceName}: ${result.stderr.trim()}`,
    );
  }
}

export function startService(
  connectConfig: ConnectConfig,
  serviceName: string,
  sshExec: SshExec,
): Promise<void> {
  return runServiceCommand(connectConfig, serviceName, "start", sshExec);
}

export function stopService(
  connectConfig: ConnectConfig,
  serviceName: string,
  sshExec: SshExec,
): Promise<void> {
  return runServiceCommand(connectConfig, serviceName, "stop", sshExec);
}

export function restartService(
  connectConfig: ConnectConfig,
  serviceName: string,
  sshExec: SshExec,
): Promise<void> {
  return runServiceCommand(connectConfig, serviceName, "restart", sshExec);
}
