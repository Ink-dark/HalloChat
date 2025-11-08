const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const userModel = require('../models/user.model');

/**
 * 用户认证服务
 * 处理登录验证、密码加密等核心业务逻辑
 */
class AuthService {
  /**
   * 验证用户登录信息
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 用户信息或错误信息
   */
  static async validateUser(username, password) {
    try {
      const user = await userModel.loginUser(username, password);
      logger.info(`登录成功 - ${username}`);
      return { success: true, user };
    } catch (error) {
      logger.warn(`登录失败: ${error.message} - ${username}`);
      return { success: false, error: error.message || '用户名或密码错误' };
    }
  }

  /**
   * 注册新用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 新创建的用户信息
   */
  static async registerUser(userData) {
    try {
      const result = await userModel.registerUser(userData);
      logger.info(`注册成功 - ${userData.username}`);
      return { success: true, user: result };
    } catch (error) {
      logger.error(`注册异常: ${error.message}`, { stack: error.stack });
      return { success: false, error: error.message || '服务器注册过程出错' };
    }
  }
}

module.exports = AuthService;