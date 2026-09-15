import type { ConnectConfig } from "ssh2";
import type { SshExecResult } from "../ssh/sshExec";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceState = "running" | "stopped";

export type ServiceAction = "start" | "stop" | "restart";

export interface ServiceInfo {
  name: string;
  state: ServiceState;
  status: ServiceState;
  description: string | null;
}

interface ProcdInstance {
  running?: boolean;
}

interface ProcdService {
  instances?: Record<string, ProcdInstance>;
}

type ProcdServices = Record<string, ProcdService>;

export type SshExec = (
  connectConfig: ConnectConfig,
  command: string,
) => Promise<SshExecResult>;

// ─── Service Listing ──────────────────────────────────────────────────────────

export async function listServices(
  connectConfig: ConnectConfig,
  sshExec: SshExec,
): Promise<ServiceInfo[]> {
  const [initResult, runtimeResult] = await Promise.all([
    sshExec(connectConfig, "ls -1 /etc/init.d"),
    sshExec(connectConfig, "ubus call service list"),
  ]);

  if (initResult.exitCode !== 0) {
    throw new Error(
      `Failed to list procd services: ${initResult.stderr.trim()}`,
    );
  }

  if (runtimeResult.exitCode !== 0) {
    throw new Error(
      `Failed to retrieve procd runtime state: ${runtimeResult.stderr.trim()}`,
    );
  }

  const serviceNames = initResult.stdout
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  const runtimeServices = parseServices(runtimeResult.stdout);

  return serviceNames.map((name): ServiceInfo => {
    const runtimeService = runtimeServices[name];

    const state = normalizeState(runtimeService);

    return {
      name,
      state,
      status: state,
      description: null,
    };
  });
}

// ─── State Parsing ────────────────────────────────────────────────────────────

function normalizeState(service: ProcdService | undefined): ServiceState {
  if (!service) {
    return "stopped";
  }

  const instances = Object.values(service.instances ?? {});

  if (instances.some((instance) => instance.running === true)) {
    return "running";
  }

  return "stopped";
}

function parseServices(output: string): ProcdServices {
  try {
    return JSON.parse(output) as ProcdServices;
  } catch {
    throw new Error("Failed to parse procd service response");
  }
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
    `service ${serviceName} ${action}`,
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `service ${serviceName} ${action} failed: ${result.stderr.trim()}`,
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
