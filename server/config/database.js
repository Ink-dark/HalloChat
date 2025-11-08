const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = config.database.url || 'mongodb://localhost:27017/hallochat';
      
      const mongooseOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // 连接池大小
        serverSelectionTimeoutMS: 5000, // 超时时间
        socketTimeoutMS: 45000, // socket超时
      };

      this.connection = await mongoose.connect(mongoUri, mongooseOptions);
      
      logger.info('✅ MongoDB连接成功', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });

      // 监听连接事件
      mongoose.connection.on('error', (err) => {
        logger.error('❌ MongoDB连接错误:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB连接断开');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB重新连接');
      });

      return this.connection;
    } catch (error) {
      logger.error('❌ MongoDB连接失败:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('📴 MongoDB连接已关闭');
      }
    } catch (error) {
      logger.error('❌ MongoDB断开连接错误:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      return {
        status: states[state] || 'unknown',
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name,
        readyState: state
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new Database();