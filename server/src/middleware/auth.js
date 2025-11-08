const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const logger = require('../../utils/logger').createLogger('auth');
const { RESPONSE } = require('../../utils/constants');

/**
 * 身份验证中间件
 * 验证请求中的JWT令牌并将用户信息附加到请求对象
 */
const auth = async (req, res, next) => {
  try {
    // 从请求头中获取令牌
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('未提供访问令牌');
      return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
        success: false,
        message: '未授权访问，请提供有效的访问令牌'
      });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    // 查找对应的用户
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      logger.warn('无效的令牌 - 用户不存在');
      return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 将令牌和用户信息附加到请求对象
    req.token = token;
    req.user = user;
    
    logger.debug('用户验证成功', { userId: user._id, username: user.username });
    next();
  } catch (error) {
    logger.error('身份验证失败', { error: error.message });
    
    // 处理不同类型的错误
    if (error.name === 'TokenExpiredError') {
      return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
        success: false,
        message: '访问令牌已过期，请重新登录'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
        success: false,
        message: '无效的访问令牌'
      });
    }
    
    // 其他错误
    res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
      success: false,
      message: '身份验证失败'
    });
  }
};

module.exports = auth;