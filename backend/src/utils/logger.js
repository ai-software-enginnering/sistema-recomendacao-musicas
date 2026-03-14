export class Logger {
  static info(context, message, data = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      context,
      message,
      ...data
    }));
  }

  static error(context, message, error = {}) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context,
      message,
      error: error.message || String(error),
      stack: error.stack
    }));
  }

  static warn(context, message, data = {}) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      context,
      message,
      ...data
    }));
  }
}