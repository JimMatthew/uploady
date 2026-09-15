import { actions } from "../db";
import { getServerOptions } from "./serverService";
import { sshExec, type SshExecResult } from "../infrastructure/ssh/sshExec";

import type {
  Action,
  CreateActionData,
  UpdateActionData,
} from "../db/stores/actionStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaptureActionResult extends SshExecResult {
  mode: "capture";
}

export interface TerminalActionResult {
  mode: "terminal";
  serverId: string;
  command: string;
}

export type ActionExecutionResult = CaptureActionResult | TerminalActionResult;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Returns all saved actions.
 */
export async function getAll(): Promise<Action[]> {
  return actions.getAll();
}

/**
 * Returns a saved action by ID.
 */
export async function getById(id: string): Promise<Action | null> {
  return actions.getById(id);
}

/**
 * Creates a saved action.
 */
export async function create(action: CreateActionData): Promise<Action> {
  return actions.create(action);
}

/**
 * Updates a saved action.
 */
export async function update(
  id: string,
  updates: UpdateActionData,
): Promise<Action | null> {
  return actions.update(id, updates);
}

/**
 * Deletes a saved action.
 */
export async function deleteAction(id: string): Promise<Action | null> {
  return actions.delete(id);
}

// ─── Execution ────────────────────────────────────────────────────────────────

/**
 * Executes a saved action according to its configured execution mode.
 *
 * Capture actions are executed immediately over SSH. Terminal actions return
 * the information needed by the client to execute the command in an
 * interactive SSH terminal.
 */
export async function execute(
  actionId: string,
): Promise<ActionExecutionResult> {
  const action = await actions.getById(actionId);

  if (!action) {
    throw new Error("Action not found");
  }

  const mode: string = action.mode;

  switch (action.mode) {
    case "capture":
      return executeCapture(action);

    case "terminal":
      return executeTerminal(action);

    default:
      throw new Error(`Unsupported action mode: ${mode}`);
  }
}

/**
 * Executes a capture action over SSH and returns its output.
 */
async function executeCapture(action: Action): Promise<CaptureActionResult> {
  const connectConfig = await getServerOptions(action.serverId);

  const result = await sshExec(connectConfig, action.command);

  return {
    mode: "capture",
    ...result,
  };
}

/**
 * Creates the result for a terminal action.
 *
 * The command is not executed here. The client uses the returned server ID
 * and command to open an interactive SSH terminal and execute it.
 */
function executeTerminal(action: Action): TerminalActionResult {
  return {
    mode: "terminal",
    serverId: action.serverId,
    command: action.command,
  };
}

// Preserve the existing exported `delete` name.
export { deleteAction as delete };
