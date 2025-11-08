const winston = require('winston');
const path = require('path');
const { LOG_LEVELS, ENVIRONMENTS } = require('./constants');
const config = require('../src/config/config');

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');

// 日志配置
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'hallochat-server' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 所有日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    
    // 访问日志
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV === ENVIRONMENTS.DEVELOPMENT) {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 创建日志流（用于HTTP请求日志）
const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// 创建子日志器
const createLogger = (service) => {
  return winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    defaultMeta: { service },
    transports: logger.transports
  });
};

module.exports = {
  logger,
  stream,
  createLogger
};