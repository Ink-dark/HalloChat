const redis = require('redis');
const { config } = require('../config/index');
const logger = require('./utils/logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // 使用配置中的redis参数
      this.client = redis.createClient({
        url: config.redis.uri,
        ...config.redis.options
      });

      // 监听连接事件
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });

      // 连接到redis
      await this.client.connect();
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected || !this.client) {
        return { status: 'disconnected', message: 'Redis is not connected' };
      }

      const pong = await this.client.ping();
      if (pong === 'PONG') {
        return { status: 'healthy', message: 'Redis is running' };
      } else {
        return { status: 'unhealthy', message: 'Redis ping failed' };
      }
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client && this.client.isReady;
  }
}

const redisManager = new RedisManager();

module.exports = {
  redisManager,
  get redisClient() {
    return redisManager.getClient();
  }
};