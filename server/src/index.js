const express = require('express');
const morgan = require('morgan');
const logger = require('./utils/logger');
// 使用环境变量或默认配置
const config = {
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxConnections: process.env.MAX_CONNECTIONS || 1000,
  port: process.env.PORT || 7932,
  forceLogoutEnabled: process.env.FORCE_LOGOUT_ENABLED === 'true',
  mdns: {
    enabled: process.env.MDNS_ENABLED === 'true',
    serviceName: 'hallochat',
    displayName: 'HalloChat Server'
  }
};
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
// 数据库连接函数
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hallochat';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB数据库连接成功');
    console.log('MongoDB数据库连接成功');
  } catch (error) {
    logger.error('MongoDB数据库连接失败:', error);
    console.error('MongoDB数据库连接失败:', error);
    process.exit(1);
  }
};
const { createServer } = require('http');
const { Server } = require('socket.io');
const mdns = require('mdns-js');

// 创建Express应用
const app = express();
const httpServer = createServer(app);

// 配置CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// 安全头设置
app.use(helmet());

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 压缩响应
app.use(compression());

// 日志中间件 - 将Morgan日志输出重定向到Winston
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// 应用配置：最大连接数
app.set('maxConnections', config.maxConnections);

// 连接数据库
connectDB();

// 路由配置
const routes = require('./routes');
app.use('/api', routes);

// 强制下线接口（根据config.forceLogoutEnabled控制是否启用）
if (config.forceLogoutEnabled) {
  app.post('/api/force-logout', (req, res) => {
    // 实现强制下线逻辑（如清除用户会话）
    res.send({ success: true, message: "用户已强制下线" });
  });
}

// 创建Socket.IO服务器
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 导出io实例供其他模块使用
module.exports = io;

// 启动HTTP服务器
httpServer.listen(config.port, () => {
  logger.info(`服务已启动，端口：${config.port}`);
  console.log(`服务已启动，端口：${config.port}`);
  
  // 启用MDNS服务广播（如果配置启用）
  if (config.mdns && config.mdns.enabled) {
    try {
      const ad = mdns.createAdvertisement(
        mdns.tcp(config.mdns.serviceName), 
        config.port, 
        {
          name: config.mdns.displayName,
          txt: {
            version: require('../package.json').version,
            description: 'HalloChat Real-time Messaging Server'
          }
        }
      );
      ad.start();
      logger.info('MDNS服务广播已启动');
      console.log('MDNS服务广播已启动');
    } catch (error) {
      logger.error('MDNS服务广播启动失败:', error);
      console.error('MDNS服务广播启动失败:', error);
    }
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err);
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (err) => {
  logger.error('未处理的Promise拒绝:', err);
});