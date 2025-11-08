const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const mdns = require('mdns-js');
const { redisManager } = require('./redis');

const config = require('./config/config');
const { errorHandler, notFoundHandler, asyncHandler } = require('../middleware/errorHandler');
const { LOG_LEVELS, ENVIRONMENTS } = require('../utils/constants');
const logger = require('../utils/logger');

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const chatRoutes = require('./routes/chat');
const friendRoutes = require('./routes/friends');

// Socket处理器导入
const socketHandler = require('./socket.handler');

class HalloChatServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.isShuttingDown = false;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS配置
    this.app.use(cors({
      origin: config.server.cors.origin,
      methods: config.server.cors.methods,
      allowedHeaders: config.server.cors.allowedHeaders,
      credentials: true
    }));

    // 压缩中间件
    this.app.use(compression());

    // 请求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 速率限制
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: config.rateLimit.message,
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // 请求日志
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
      next();
    });

    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('../package.json').version
      });
    });
  }

  setupRoutes() {
    // API路由
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/messages', messageRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/friends', friendRoutes);

    // 404处理
    this.app.use(notFoundHandler);
  }

  setupErrorHandling() {
    // 全局错误处理
    this.app.use(errorHandler);
  }

  async connectDatabase() {
    try {
      const mongooseOptions = {
        ...config.database.options,
        bufferCommands: false,
        bufferMaxEntries: 0
      };

      await mongoose.connect(config.database.uri, mongooseOptions);
      logger.info('Connected to MongoDB', { uri: config.database.uri });
    } catch (error) {
      logger.error('MongoDB connection failed', { error: error.message });
      throw error;
    }
  }

  async setupRedis() {
    try {
      await redisManager.connect();
      logger.info('Connected to Redis');
    } catch (error) {
      logger.error('Redis connection failed', { error: error.message });
      // 在开发环境下，如果Redis连接失败，程序继续运行
      if (config.env === 'production') {
        throw error;
      }
    }
  }

  setupSocketIO() {
    this.server = http.createServer(this.app);
    
    // 使用socket.handler初始化Socket.IO
    this.io = socketHandler(this.server);
    logger.info('Socket.IO server initialized');
  }

  setupMDNS() {
    if (config.mdns.enabled) {
      try {
        const ad = mdns.createAdvertisement(
          mdns.tcp(config.mdns.serviceName), 
          config.server.port,
          {
            name: config.mdns.displayName,
            txt: {
              version: require('../package.json').version,
              description: 'HalloChat Real-time Messaging Server'
            }
          }
        );
        ad.start();
        logger.info('MDNS advertisement started', { service: config.mdns.displayName });
      } catch (error) {
        logger.warn('MDNS advertisement failed', { error: error.message });
      }
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // 关闭Socket.IO
        if (this.io) {
          this.io.close();
          logger.info('Socket.IO server closed');
        }

        // 关闭HTTP服务器
        if (this.server) {
          this.server.close(() => {
            logger.info('HTTP server closed');
          });
        }

        // 关闭数据库连接
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');

        // 关闭Redis连接
        try {
          await redisManager.disconnect();
          logger.info('Redis connection closed');
        } catch (redisError) {
          logger.error('Error closing Redis connection', { error: redisError.message });
          // 继续关闭过程，不因为Redis错误而中断
        }

        // 退出进程
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }

  async start() {
    try {
      logger.info('Starting HalloChat server...');

      // 连接数据库
      await this.connectDatabase();

      // 连接Redis
      await this.setupRedis();

      // 设置Socket.IO
      this.setupSocketIO();

      // 设置MDNS
      this.setupMDNS();

      // 设置优雅关闭
      this.setupGracefulShutdown();

      // 启动服务器
      this.server.listen(config.server.port, () => {
        logger.info(`HalloChat server running on port ${config.server.port}`, {
          port: config.server.port,
          environment: config.env,
          version: require('../package.json').version
        });
      });

    } catch (error) {
      logger.error('Failed to start server', { error: error.message });
      process.exit(1);
    }
  }
}

// 导出实例
const server = new HalloChatServer();

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  server.start();
}

module.exports = server;