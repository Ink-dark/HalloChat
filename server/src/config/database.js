const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./config');

// MongoDB连接函数
const connectDB = async () => {
  try {
    // 连接数据库
    await mongoose.connect(config.mongoURI, config.mongoOptions);
    
    logger.info('MongoDB数据库连接成功');
    console.log('MongoDB数据库连接成功');
    
    // 监听连接事件
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB连接已建立');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB连接错误:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB连接已断开');
    });
    
    // 处理进程终止时关闭连接
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB连接已关闭（应用程序终止）');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('MongoDB连接失败:', error);
    console.error('MongoDB连接失败:', error);
    // 重试连接
    setTimeout(() => {
      logger.info('正在重试MongoDB连接...');
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;