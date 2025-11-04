/**
 * Structured logging utility for Cloud Functions
 * Google Cloud Functions automatically parse JSON logs into structured logs
 */

export interface LogEntry {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  [key: string]: unknown;
}

/**
 * Create a structured log entry
 */
export function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}

/**
 * Log an info message
 */
export function logInfo(message: string, metadata?: Record<string, unknown>): void {
  log({
    severity: 'INFO',
    message,
    ...metadata,
  });
}

/**
 * Log a warning message
 */
export function logWarning(message: string, metadata?: Record<string, unknown>): void {
  log({
    severity: 'WARNING',
    message,
    ...metadata,
  });
}

/**
 * Log an error message
 */
export function logError(
  message: string,
  error?: Error | unknown,
  metadata?: Record<string, unknown>
): void {
  const errorData: Record<string, unknown> = {
    severity: 'ERROR',
    message,
    ...metadata,
  };

  if (error instanceof Error) {
    errorData.error = error.message;
    errorData.stack = error.stack;
  } else if (error) {
    errorData.error = String(error);
  }

  console.error(JSON.stringify(errorData));
}

/**
 * Log a debug message
 */
export function logDebug(message: string, metadata?: Record<string, unknown>): void {
  log({
    severity: 'DEBUG',
    message,
    ...metadata,
  });
}

