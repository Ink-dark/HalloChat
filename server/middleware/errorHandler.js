const winston = require('winston');

// 错误码定义
const ERROR_CODES = {
  // 认证相关
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH001', message: 'Invalid username or password', status: 401 },
  AUTH_TOKEN_EXPIRED: { code: 'AUTH002', message: 'Token expired', status: 401 },
  AUTH_TOKEN_INVALID: { code: 'AUTH003', message: 'Invalid token', status: 401 },
  AUTH_UNAUTHORIZED: { code: 'AUTH004', message: 'Unauthorized access', status: 403 },
  
  // 用户相关
  USER_NOT_FOUND: { code: 'USER001', message: 'User not found', status: 404 },
  USER_ALREADY_EXISTS: { code: 'USER002', message: 'User already exists', status: 409 },
  USER_INVALID_INPUT: { code: 'USER003', message: 'Invalid user input', status: 400 },
  
  // 服务器相关
  SERVER_CONNECTION_FAILED: { code: 'SERVER001', message: 'Server connection failed', status: 500 },
  SERVER_INTERNAL_ERROR: { code: 'SERVER002', message: 'Internal server error', status: 500 },
  SERVER_NOT_FOUND: { code: 'SERVER003', message: 'Server not found', status: 404 },
  
  // 消息相关
  MESSAGE_NOT_FOUND: { code: 'MSG001', message: 'Message not found', status: 404 },
  MESSAGE_INVALID: { code: 'MSG002', message: 'Invalid message format', status: 400 },
  
  // 数据库相关
  DATABASE_CONNECTION_FAILED: { code: 'DB001', message: 'Database connection failed', status: 500 },
  DATABASE_QUERY_FAILED: { code: 'DB002', message: 'Database query failed', status: 500 },
  
  // 验证相关
  VALIDATION_FAILED: { code: 'VALID001', message: 'Validation failed', status: 400 },
  RATE_LIMIT_EXCEEDED: { code: 'RATE001', message: 'Rate limit exceeded', status: 429 }
};

// 自定义错误类
class AppError extends Error {
  constructor(code, message = null, details = null) {
    const errorInfo = ERROR_CODES[code] || ERROR_CODES.SERVER_INTERNAL_ERROR;
    super(message || errorInfo.message);
    this.name = 'AppError';
    this.code = code;
    this.status = errorInfo.status;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// 错误日志记录器
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 错误处理中间件
function errorHandler(err, req, res, next) {
  let error;

  // 处理已知的AppError
  if (err instanceof AppError) {
    error = err;
  }
  // 处理Mongoose验证错误
  else if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => e.message);
    error = new AppError('VALIDATION_FAILED', null, details);
  }
  // 处理Mongoose重复键错误
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError('USER_ALREADY_EXISTS', `${field} already exists`);
  }
  // 处理JWT错误
  else if (err.name === 'JsonWebTokenError') {
    error = new AppError('AUTH_TOKEN_INVALID');
  }
  else if (err.name === 'TokenExpiredError') {
    error = new AppError('AUTH_TOKEN_EXPIRED');
  }
  // 处理其他错误
  else {
    error = new AppError('SERVER_INTERNAL_ERROR', err.message);
  }

  // 记录错误日志
  logger.error({
    error: {
      code: error.code,
      message: error.message,
      stack: err.stack,
      details: error.details,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // 发送错误响应
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details })
    },
    timestamp: error.timestamp
  };

  // 开发环境添加堆栈信息
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(error.status).json(response);
}

// 404处理中间件
function notFoundHandler(req, res, next) {
  const error = new AppError('SERVER_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
  errorHandler(error, req, res, next);
}

// 异步错误包装器
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ERROR_CODES
};