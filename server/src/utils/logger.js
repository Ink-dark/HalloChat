const winston = require('winston');
const { format } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');

// 日志格式（JSON+时间戳+级别）
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.json()
);

// 日志实例
const logger = winston.createLogger({ 
  level: 'info', // 默认级别（可通过环境变量调整）
  format: logFormat,
  transports: [
    // 控制台输出（开发环境）
    new winston.transports.Console({ format: format.simple() }),
    // 按天轮转文件（生产环境）
    new DailyRotateFile({ 
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // 单文件最大20MB
      maxFiles: '30d' // 保留30天日志
    })
  ]
});

export default logger;