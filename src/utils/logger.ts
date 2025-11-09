/**
 * Logger utility for consistent logging across the app
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

class Logger {
  private minLevel: number = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, tag: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${tag}]`;

    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  debug(tag: string, message: string, data?: any): void {
    if (this.shouldLog('DEBUG')) {
      this.formatMessage('DEBUG', tag, message, data);
    }
  }

  info(tag: string, message: string, data?: any): void {
    if (this.shouldLog('INFO')) {
      this.formatMessage('INFO', tag, message, data);
    }
  }

  warn(tag: string, message: string, data?: any): void {
    if (this.shouldLog('WARN')) {
      this.formatMessage('WARN', tag, message, data);
    }
  }

  error(tag: string, message: string, error?: any): void {
    if (this.shouldLog('ERROR')) {
      this.formatMessage('ERROR', tag, message, error);
    }
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = LOG_LEVELS[level];
  }
}

export const logger = new Logger();
export default logger;
