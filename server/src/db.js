const mongoose = require('mongoose');
const config = require('./config/config');
const logger = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      const mongooseOptions = {
        ...config.database.options,
        bufferCommands: false,
        bufferMaxEntries: 0,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(config.database.uri, mongooseOptions);
      this.isConnected = true;

      // 监听连接事件
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database is not connected' };
      }

      // 执行健康检查查询
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      
      return {
        status: 'healthy',
        version: result.version,
        uptime: mongoose.connection.readyState
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }

  getConnection() {
    return mongoose.connection;
  }

  getDatabase() {
    return mongoose.connection.db;
  }

  async dropDatabase() {
    if (process.env.NODE_ENV === 'test') {
      try {
        await mongoose.connection.dropDatabase();
        logger.info('Database dropped successfully');
      } catch (error) {
        logger.error('Error dropping database:', error);
        throw error;
      }
    }
  }
}

const databaseManager = new DatabaseManager();

module.exports = {
  databaseManager,
  mongoose
};