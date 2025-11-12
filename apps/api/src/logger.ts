import os from 'os';
import type { NextFunction, Request, Response } from 'express';

const LEVEL_INDEX = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
} as const;

type LogLevel = keyof typeof LEVEL_INDEX;

type LogPayload = Record<string, unknown>;

type LogMethod = (arg1?: string | LogPayload, arg2?: string | LogPayload) => void;

export interface Logger {
  level: LogLevel;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  debug: LogMethod;
  child(bindings?: LogPayload): Logger;
}

interface CreateLoggerOptions {
  level?: string;
  name?: string;
  baseFields?: LogPayload;
}

const DEFAULT_SERVICE_NAME = 'mega-directory-api';

type RequestLogger = (req: Request, res: Response, next: NextFunction) => void;

function resolveLevelName(level?: string): LogLevel {
  const fallback: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  if (!level) {
    return fallback;
  }
  const candidate = level.toLowerCase();
  return LEVEL_INDEX[candidate as LogLevel] !== undefined ? (candidate as LogLevel) : fallback;
}

function shouldLog(targetLevel: LogLevel, threshold: LogLevel) {
  return LEVEL_INDEX[targetLevel] <= LEVEL_INDEX[threshold];
}

function writeEntry(targetLevel: LogLevel, baseFields: LogPayload, data: LogPayload, message: string) {
  const entry = {
    level: targetLevel,
    time: new Date().toISOString(),
    msg: message,
    pid: process.pid,
    hostname: os.hostname(),
    ...baseFields,
    ...data
  };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function buildMethod(targetLevel: LogLevel, baseFields: LogPayload, threshold: LogLevel): LogMethod {
  return (arg1, arg2) => {
    if (!shouldLog(targetLevel, threshold)) {
      return;
    }

    let data: LogPayload = {};
    let message = '';

    if (typeof arg1 === 'string') {
      message = arg1;
      if (arg2 && typeof arg2 === 'object') {
        data = arg2 as LogPayload;
      }
    } else if (arg1 && typeof arg1 === 'object') {
      data = arg1 as LogPayload;
      if (typeof arg2 === 'string') {
        message = arg2;
      }
    } else if (arg1 !== undefined) {
      message = String(arg1);
    }

    writeEntry(targetLevel, baseFields, data, message);
  };
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const levelName = resolveLevelName(options.level);
  const baseFields: LogPayload = {
    service: options.name || DEFAULT_SERVICE_NAME,
    ...(options.baseFields || {})
  };

  return {
    level: levelName,
    info: buildMethod('info', baseFields, levelName),
    warn: buildMethod('warn', baseFields, levelName),
    error: buildMethod('error', baseFields, levelName),
    debug: buildMethod('debug', baseFields, levelName),
    child(bindings: LogPayload = {}) {
      return createLogger({
        level: levelName,
        name: baseFields.service as string,
        baseFields: { ...baseFields, ...bindings }
      });
    }
  };
}

export function createRequestLogger(logger?: Logger): RequestLogger {
  if (!logger || typeof logger.info !== 'function') {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const diffNs = process.hrtime.bigint() - start;
      const durationMs = Number(diffNs) / 1e6;
      const roundedDuration = Math.round(durationMs * 1000) / 1000;
      logger.info(
        {
          event: 'http.request',
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs: roundedDuration
        },
        'Handled request'
      );
    });
    next();
  };
}
