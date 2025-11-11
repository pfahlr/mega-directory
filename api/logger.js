const os = require('os');

const LEVEL_INDEX = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
};

function resolveLevelName(level) {
  const fallback = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  const candidate = (level || process.env.LOG_LEVEL || fallback).toLowerCase();
  return LEVEL_INDEX[candidate] !== undefined ? candidate : fallback;
}

function createLogger(options = {}) {
  const levelName = resolveLevelName(options.level);
  const threshold = LEVEL_INDEX[levelName];
  const baseFields = {
    service: options.name || 'mega-directory-api',
    hostname: os.hostname(),
    ...(options.baseFields || {})
  };

  function shouldLog(targetLevel) {
    return LEVEL_INDEX[targetLevel] <= threshold;
  }

  function write(targetLevel, data, message) {
    const entry = {
      level: targetLevel,
      time: new Date().toISOString(),
      msg: message || '',
      pid: process.pid,
      ...baseFields,
      ...data
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }

  function buildMethod(targetLevel) {
    return (arg1, arg2) => {
      if (!shouldLog(targetLevel)) {
        return;
      }
      let data = {};
      let message = '';
      if (typeof arg1 === 'string') {
        message = arg1;
        if (arg2 && typeof arg2 === 'object') {
          data = arg2;
        }
      } else if (arg1 && typeof arg1 === 'object') {
        data = arg1;
        if (typeof arg2 === 'string') {
          message = arg2;
        }
      } else if (arg1 !== undefined) {
        message = String(arg1);
      }
      write(targetLevel, data, message);
    };
  }

  const logger = {
    level: levelName,
    info: buildMethod('info'),
    warn: buildMethod('warn'),
    error: buildMethod('error'),
    debug: buildMethod('debug'),
    child(bindings = {}) {
      return createLogger({
        level: levelName,
        name: baseFields.service,
        baseFields: { ...baseFields, ...bindings }
      });
    }
  };

  return logger;
}

function createRequestLogger(logger) {
  if (!logger || typeof logger.info !== 'function') {
    return (_req, _res, next) => next();
  }
  return (req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationMs = diff[0] * 1e3 + diff[1] / 1e6;
      logger.info(
        {
          event: 'http.request',
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(3))
        },
        'Handled request'
      );
    });
    next();
  };
}

module.exports = {
  createLogger,
  createRequestLogger
};
