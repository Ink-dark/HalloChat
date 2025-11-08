const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/user.model');
const { asyncHandler } = require('../../middleware/errorHandler');
const { USER, RESPONSE } = require('../../utils/constants');
const logger = require('../../utils/logger').createLogger('auth');

const router = express.Router();

// 注册验证规则
const registerValidation = [
  // 用户名验证
  body('username')
    .isLength({ min: USER.USERNAME.MIN_LENGTH, max: USER.USERNAME.MAX_LENGTH })
    .withMessage(`用户名长度必须在${USER.USERNAME.MIN_LENGTH}-${USER.USERNAME.MAX_LENGTH}个字符之间`)
    .matches(USER.USERNAME.PATTERN)
    .withMessage(USER.USERNAME.MESSAGE),
  
  // 邮箱验证 - 确保正确设置参数名称
  body('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .bail() // 如果前面的验证失败，不再继续验证
    .isEmail()
    .withMessage(USER.EMAIL.MESSAGE)
    .normalizeEmail(),
  
  // 密码验证
  body('password')
    .isLength({ min: USER.PASSWORD.MIN_LENGTH, max: USER.PASSWORD.MAX_LENGTH })
    .withMessage(`密码长度必须在${USER.PASSWORD.MIN_LENGTH}-${USER.PASSWORD.MAX_LENGTH}个字符之间`)
    .matches(USER.PASSWORD.PATTERN)
    .withMessage(USER.PASSWORD.MESSAGE)
];

// 登录验证规则
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-jwt-secret-key',
    { expiresIn: '7d' }
  );
};

// 注册
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }

  const { username, email, password } = req.body;

  try {
    // 使用User模型中的registerUser静态方法注册用户
    // 注意：这里不需要手动哈希密码，registerUser方法会处理
    const user = await User.registerUser({
      username,
      email,
      password
    });

    // 生成令牌
    const token = generateToken(user._id);

    logger.info('User registered', { userId: user._id, username });

    res.status(RESPONSE.SUCCESS.CREATED).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    // 处理用户已存在的错误
    if (error.status === 409) {
      return res.status(RESPONSE.ERROR.CONFLICT).json({
        success: false,
        message: error.message
      });
    }
    
    // 处理其他错误
    throw error;
  }
}));

// 登录
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  // 添加详细的请求日志
  logger.info('Login request received', { username: req.body.username });
  
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Login validation failed', { username: req.body.username, errors: errors.array() });
    return res.status(RESPONSE.ERROR.BAD_REQUEST).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }

  const { username, password } = req.body;
  logger.info('Login request validated successfully', { username });

  // 查找用户
  logger.info('Finding user in database', { username });
  const user = await User.findOne({
    $or: [{ username }, { email: username }]
  });

  if (!user) {
    logger.warn('User not found', { username });
    return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
      success: false,
      message: '用户名或密码错误'
    });
  }

  // 验证密码
  logger.info('Validating password for user', { username });
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    logger.warn('Password validation failed', { username });
    return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
      success: false,
      message: '用户名或密码错误'
    });
  }

  // 更新最后登录时间
  user.lastLogin = new Date();
  await user.save();
  logger.info('User last login time updated', { username, lastLogin: user.lastLogin });

  // 生成令牌
  const token = generateToken(user._id);
  logger.info('Authentication token generated', { username, token });

  logger.info('User logged in successfully', { userId: user._id, username: user.username, token });

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    }
  });
}));

// 验证令牌
router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
      success: false,
      message: '未提供访问令牌'
    });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    return res.status(RESPONSE.ERROR.UNAUTHORIZED).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
}));

module.exports = router;