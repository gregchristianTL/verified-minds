/**
 * Lightweight structured logger.
 *
 * Outputs JSON in production for log aggregation and human-readable
 * output in development.
 */

/** Severity levels supported by the logger */
type LogLevel = "info" | "warn" | "error";

/** A single log entry with level, message, and optional context */
interface LogEntry {
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Write a structured log entry to the console.
 *
 * @param entry - log entry containing level, message, and optional context fields
 */
function log(entry: LogEntry): void {
  const { level, message, ...context } = entry;
  const hasContext = Object.keys(context).length > 0;

  if (IS_PROD) {
    const payload = { ts: new Date().toISOString(), level, message, ...context };
    const output = JSON.stringify(payload);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    // eslint-disable-next-line no-console
    else console.info(output);
    return;
  }

  const prefix = `[${level.toUpperCase()}]`;
  const ctx = hasContext ? ` ${JSON.stringify(context)}` : "";
  if (level === "error") console.error(`${prefix} ${message}${ctx}`);
  else if (level === "warn") console.warn(`${prefix} ${message}${ctx}`);
  // eslint-disable-next-line no-console
  else console.info(`${prefix} ${message}${ctx}`);
}

export const logger = {
  /**
   * Log an informational message.
   *
   * @param message - the log message
   * @param context - optional key-value pairs to include
   * @returns void
   */
  info: (message: string, context?: Record<string, unknown>): void =>
    log({ level: "info", message, ...context }),
  /**
   * Log a warning message.
   *
   * @param message - the log message
   * @param context - optional key-value pairs to include
   * @returns void
   */
  warn: (message: string, context?: Record<string, unknown>): void =>
    log({ level: "warn", message, ...context }),
  /**
   * Log an error message.
   *
   * @param message - the log message
   * @param context - optional key-value pairs to include
   * @returns void
   */
  error: (message: string, context?: Record<string, unknown>): void =>
    log({ level: "error", message, ...context }),
};
