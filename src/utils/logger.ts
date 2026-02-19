export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private readonly level: LogLevel;
  private readonly context?: Record<string, unknown>;

  constructor(options: { level?: LogLevel; context?: Record<string, unknown> } = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.context = options.context;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, error?: Error): LogEntry {
    const entry: LogEntry = {
      level: LogLevel[level],
      message,
      timestamp: new Date().toISOString()
    };

    if (this.context) {
      entry.context = this.context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return entry;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatMessage(LogLevel.DEBUG, message);
    console.error(JSON.stringify(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatMessage(LogLevel.INFO, message);
    console.log(JSON.stringify(entry));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatMessage(LogLevel.WARN, message);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.formatMessage(LogLevel.ERROR, message, error);
    console.error(JSON.stringify(entry));
  }
}

export const logger = new Logger({
  level: process.env.LOG_LEVEL
    ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel]
    : LogLevel.INFO
});
