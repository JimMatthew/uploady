import type { ConnectConfig } from "ssh2";
import { getServerOptions } from "./serverService";
import { sshExec, type SshExecResult } from "../infrastructure/ssh/sshExec";

import * as systemd from "../infrastructure/serviceManagers/systemdServiceManager";
import * as procd from "../infrastructure/serviceManagers/procdServiceManager";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceManagerName = "systemd" | "procd";

export type ServiceAction = "start" | "stop" | "restart";

export type ServiceState =
  "running" | "stopped" | "starting" | "stopping" | "failed" | "unknown";

export interface ServiceInfo {
  name: string;
  state: ServiceState;
  status: string;
  description: string | null;
}

type SshExec = (
  connectConfig: ConnectConfig,
  command: string,
) => Promise<SshExecResult>;

interface ServiceManager {
  listServices(
    connectConfig: ConnectConfig,
    sshExec: SshExec,
  ): Promise<ServiceInfo[]>;

  startService(
    connectConfig: ConnectConfig,
    serviceName: string,
    sshExec: SshExec,
  ): Promise<void>;

  stopService(
    connectConfig: ConnectConfig,
    serviceName: string,
    sshExec: SshExec,
  ): Promise<void>;

  restartService(
    connectConfig: ConnectConfig,
    serviceName: string,
    sshExec: SshExec,
  ): Promise<void>;
}

interface ManagerContext {
  connectConfig: ConnectConfig;
  manager: ServiceManager;
  managerName: ServiceManagerName;
}

export interface ServiceListResult {
  supported: true;
  manager: ServiceManagerName;
  services: ServiceInfo[];
}

export interface ServiceActionResult {
  success: true;
  service: string;
  action: ServiceAction;
  manager: ServiceManagerName;
}

// ─── Managers ─────────────────────────────────────────────────────────────────

const SERVICE_MANAGERS = {
  systemd,
  procd,
} satisfies Record<ServiceManagerName, ServiceManager>;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateServiceName(serviceName: string): void {
  if (!/^[a-zA-Z0-9_.@-]+$/.test(serviceName)) {
    throw new Error("Invalid service name");
  }
}

// ─── Detection ────────────────────────────────────────────────────────────────

async function detectServiceManager(
  connectConfig: ConnectConfig,
): Promise<ServiceManagerName | null> {
  const checks: Array<{
    name: ServiceManagerName;
    command: string;
  }> = [
    {
      name: "systemd",
      command: "command -v systemctl >/dev/null 2>&1",
    },
    {
      name: "procd",
      command: "command -v ubus >/dev/null 2>&1 && [ -d /etc/init.d ]",
    },
  ];

  for (const check of checks) {
    try {
      const result = await sshExec(connectConfig, check.command);

      if (result.exitCode === 0) {
        return check.name;
      }
    } catch {
      // Try the next supported manager.
    }
  }

  return null;
}

async function getManager(serverId: string): Promise<ManagerContext> {
  const connectConfig = await getServerOptions(serverId);

  const managerName = await detectServiceManager(connectConfig);

  if (!managerName) {
    throw new Error("Unsupported service manager");
  }

  const manager = SERVICE_MANAGERS[managerName];

  return {
    connectConfig,
    manager,
    managerName,
  };
}

// ─── Service Listing ──────────────────────────────────────────────────────────

export async function listServices(
  serverId: string,
): Promise<ServiceListResult> {
  const { connectConfig, manager, managerName } = await getManager(serverId);

  const services = await manager.listServices(connectConfig, sshExec);

  return {
    supported: true,
    manager: managerName,
    services,
  };
}

// ─── Service Actions ──────────────────────────────────────────────────────────

async function runServiceAction(
  serverId: string,
  serviceName: string,
  action: ServiceAction,
): Promise<ServiceActionResult> {
  validateServiceName(serviceName);

  const { connectConfig, manager, managerName } = await getManager(serverId);

  const actions = {
    start: manager.startService,
    stop: manager.stopService,
    restart: manager.restartService,
  } satisfies Record<ServiceAction, ServiceManager["startService"]>;

  const actionMethod = actions[action];

  await actionMethod(connectConfig, serviceName, sshExec);

  return {
    success: true,
    service: serviceName,
    action,
    manager: managerName,
  };
}

export function startService(
  serverId: string,
  serviceName: string,
): Promise<ServiceActionResult> {
  return runServiceAction(serverId, serviceName, "start");
}

export function stopService(
  serverId: string,
  serviceName: string,
): Promise<ServiceActionResult> {
  return runServiceAction(serverId, serviceName, "stop");
}

export function restartService(
  serverId: string,
  serviceName: string,
): Promise<ServiceActionResult> {
  return runServiceAction(serverId, serviceName, "restart");
}
