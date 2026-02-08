type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  environment?: string;
  requestId?: string;
}

export class LoggerUtil {
  private static requestId: string = '';

  static setRequestId(id: string) {
    this.requestId = id;
  }

  private static buildEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      environment: process.env.ENVIRONMENT || 'development',
      requestId: this.requestId,
    };
  }

  static debug(message: string, data?: any) {
    if (process.env.LOG_LEVEL === 'DEBUG' || process.env.NODE_ENV === 'development') {
      const entry = this.buildEntry('DEBUG', message, data);
      console.log(JSON.stringify(entry));
    }
  }

  static info(message: string, data?: any) {
    const entry = this.buildEntry('INFO', message, data);
    console.log(JSON.stringify(entry));
  }

  static warn(message: string, data?: any) {
    const entry = this.buildEntry('WARN', message, data);
    console.warn(JSON.stringify(entry));
  }

  static error(message: string, error?: Error | any, data?: any) {
    const errorData = {
      ...data,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      },
    };
    const entry = this.buildEntry('ERROR', message, errorData);
    console.error(JSON.stringify(entry));
  }
}
