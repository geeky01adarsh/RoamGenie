// ============================================================
// Logger — Structured logging with levels and context
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, module: string, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const color = LEVEL_COLORS[level];
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${ts}] [${level.toUpperCase()}] [${module}]${RESET} ${message}${metaStr}`;
}

/** Creates a scoped logger for a module */
export function createLogger(module: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => {
      if (shouldLog('debug')) console.debug(formatMessage('debug', module, msg, meta));
    },
    info: (msg: string, meta?: Record<string, unknown>) => {
      if (shouldLog('info')) console.info(formatMessage('info', module, msg, meta));
    },
    warn: (msg: string, meta?: Record<string, unknown>) => {
      if (shouldLog('warn')) console.warn(formatMessage('warn', module, msg, meta));
    },
    error: (msg: string, meta?: Record<string, unknown>) => {
      if (shouldLog('error')) console.error(formatMessage('error', module, msg, meta));
    },
  };
}
