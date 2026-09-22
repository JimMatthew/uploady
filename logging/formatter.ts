import type { LogContext, LogRecord } from "./types";

export function formatLogRecord(record: LogRecord): string {
  const level = record.level.toUpperCase().padEnd(5);

  const component = record.component
    ? ` [${record.component}]`
    : "";

  const context = formatContext(record.context);

  return `${level}${component} ${record.message}${context}`;
}

function formatContext(context?: LogContext): string {
  if (!context) {
    return "";
  }

  const entries = Object.entries(context);

  if (entries.length === 0) {
    return "";
  }

  return " " + entries
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");
}

function formatValue(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify(formatError(value));
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function formatError(error: Error): string {
  return `${error.name}: ${error.message}`;
}