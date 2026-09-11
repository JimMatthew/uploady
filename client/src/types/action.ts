export type ActionMode =
  | "capture"
  | "terminal";

export interface ActionDraft {
  name: string;
  description: string;
  serverId: string;
  command: string;
  mode: ActionMode;
}

export interface SavedAction {
  _id: string;
  name: string;
  description?: string;
  serverId: string;
  command: string;
  mode: ActionMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActionOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CaptureActionResult {
  mode: "capture";
  output?: ActionOutput;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface TerminalActionResult {
  mode: "terminal";
  serverId: string;
  command: string;
}

export type ActionExecutionResult =
  | CaptureActionResult
  | TerminalActionResult;