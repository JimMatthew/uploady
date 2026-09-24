import type {
  Logger,
  LogContext,
  LogLevel,
  LogRecord,
} from "./types";

import { formatLogRecord } from "./formatter";

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/**
 * Lightweight application logger with severity filtering and component
 * tagging.
 *
 * AppLogger is responsible for creating structured log records and deciding
 * where console output is written. Record presentation is delegated to the
 * formatter.
 */
export class AppLogger implements Logger {
  constructor(
    private readonly minimumLevel: LogLevel,
    private readonly component?: string,
  ) {}

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  fatal(message: string, context?: LogContext): void {
      this.log("fatal", message, context);
  }

    /**
   * Creates a logger that shares the current minimum level while attaching
   * a component name to every record it produces.
   */
  child(component: string): Logger {
    return new AppLogger(this.minimumLevel, component);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): void {
    if (LEVEL_VALUES[level] < LEVEL_VALUES[this.minimumLevel]) {
      return;
    }

    const record: LogRecord = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      context,
    };

    const output = formatLogRecord(record);

    if (level === "warn" || level === "error" || level === "fatal") {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}