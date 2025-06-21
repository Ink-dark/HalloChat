const bcrypt = require('bcrypt');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * 用户认证服务
 * 处理登录验证、密码加密等核心业务逻辑
 */
class AuthService {
  /**
   * 验证用户登录信息
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 用户信息(不含密码)或错误信息
   */
  static async validateUser(username, password) {
    try {
      // 1. 查询用户是否存在
      const user = await User.findOne({ where: { username } });
      if (!user) {
        logger.warn(`登录失败: 用户不存在 - ${username}`);
        return { error: '用户名或密码错误' };
      }

      // 2. 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn(`登录失败: 密码错误 - ${username}`);
        return { error: '用户名或密码错误' };
      }

      // 3. 返回用户信息(排除敏感字段)
      const { password: _, ...userInfo } = user.toJSON();
      logger.info(`登录成功 - ${username}`);
      return { user: userInfo };
    } catch (error) {
      logger.error(`登录验证异常: ${error.message}`, { stack: error.stack });
      return { error: '服务器认证过程出错' };
    }
  }

  /**
   * 加密密码
   * @param {string} plainPassword - 明文密码
   * @returns {Promise<string>} 加密后的密码
   */
  static async hashPassword(plainPassword) {
    const saltRounds = 10;
    return bcrypt.hash(plainPassword, saltRounds);
  }
}

module.exports = AuthService;