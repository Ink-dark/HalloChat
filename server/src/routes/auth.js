const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.post('/login',
  [
    body('username')
      .isLength({ min: 3 }).withMessage('用户名至少3位')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('仅允许字母数字和下划线'),
    body('password')
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1
      }).withMessage('密码需包含大小写字母和数字')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '验证失败',
        details: errors.array() 
      });
    }
    // TODO: 实际登录逻辑
    res.json({ success: true });
    // 登录成功逻辑
    const user = { id: 123, username: req.body.username };
    const generateTokens = (user) => {
      const accessToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      return { accessToken, refreshToken };
    };
    
    // 替换原有响应（第28行）
    const tokens = generateTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ accessToken: tokens.accessToken });
  }
);

module.exports = router;